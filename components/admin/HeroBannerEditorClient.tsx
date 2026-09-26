'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ImagePlus, Plus, Trash2, Upload } from 'lucide-react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { inventoryCityOptionValue, type HeroBannerCityOption } from '@/lib/heroBannerCityOptions'

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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_BYTES = 15 * 1024 * 1024
const SOURCE_LABEL: Record<string, string> = { LOCATION: 'Location', PROPERTIES: 'Listed properties', PROJECTS: 'Published projects' }

function bytesLabel(value?: number | null) {
  if (!value) return 'Not uploaded'
  return value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`
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
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)) }
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Image upload failed (${request.status}).`))
    request.onerror = () => reject(new Error('Network error during image upload.'))
    request.send(file)
  })
}

export default function HeroBannerEditorClient({ bannerId }: { bannerId?: string }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [cityOptions, setCityOptions] = useState<HeroBannerCityOption[]>([])
  const [desktopFile, setDesktopFile] = useState<LocalImage | null>(null)
  const [mobileFile, setMobileFile] = useState<LocalImage | null>(null)
  const [progress, setProgress] = useState<Record<Slot, number | null>>({ desktop: null, mobile: null })
  const [previewMode, setPreviewMode] = useState<Slot>('desktop')
  const [newCityName, setNewCityName] = useState('')
  const [loading, setLoading] = useState(Boolean(bannerId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedCity = useMemo(() => cityOptions.find((city) => city.id === draft?.cityId), [cityOptions, draft?.cityId])
  const cityDropdownOptions = useMemo(() => [
    { value: '', label: 'Select a city' },
    ...cityOptions.map((city) => ({
      value: inventoryCityOptionValue(city),
      label: `${city.name} · ${city.sources.map((source) => SOURCE_LABEL[source]).join(', ')}`,
    })),
  ], [cityOptions])

  const loadCities = useCallback(async (countryCode: CountryCode) => {
    const response = await fetch(`/api/admin/hero-banners/locations?country=${countryCode}`, { cache: 'no-store' })
    const json = await response.json()
    if (!response.ok || !json.success) throw new Error(json.message || 'Could not load cities from current inventory.')
    setCityOptions(json.cities || [])
  }, [])

  useEffect(() => {
    if (!bannerId) {
      setDraft({ scope: 'CITY', category: 'BUY', cityId: '', countryCode: 'INDIA', headline: '', subheadline: '', desktopImageAlt: '', mobileImageAlt: '' })
      return
    }
    let cancelled = false
    fetch(`/api/admin/hero-banners/${encodeURIComponent(bannerId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.message || 'Could not load this banner.')
        const banner = json.data as Banner
        if (!cancelled) setDraft({
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
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load this banner.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bannerId])

  useEffect(() => {
    if (!draft || draft.scope !== 'CITY') return
    let cancelled = false
    loadCities(draft.countryCode).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load cities.')
    })
    return () => { cancelled = true }
  }, [draft?.scope, draft?.countryCode, loadCities])

  useEffect(() => () => {
    if (desktopFile) URL.revokeObjectURL(desktopFile.url)
    if (mobileFile) URL.revokeObjectURL(mobileFile.url)
  }, [desktopFile, mobileFile])

  const resolveCity = async (countryCode: CountryCode, name: string) => {
    const response = await fetch('/api/admin/locations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: countryCode === 'INDIA' ? 'IN' : 'AE', name }),
    })
    const json = await response.json()
    if (!response.ok || !json.success) throw new Error(json.message || 'Could not add this city to canonical locations.')
    return json.city as City
  }

  const selectCity = async (value: string | string[]) => {
    if (!draft) return
    const option = cityOptions.find((city) => inventoryCityOptionValue(city) === String(value))
    if (!option) { setDraft({ ...draft, cityId: '' }); return }
    if (option.id) { setDraft({ ...draft, cityId: option.id }); return }
    setBusy(true)
    setError('')
    try {
      const city = await resolveCity(draft.countryCode, option.name)
      setCityOptions((previous) => previous.map((item) => item.name.toLowerCase() === city.name.toLowerCase() ? { ...item, id: city.id, name: city.name } : item))
      setDraft((previous) => previous ? { ...previous, cityId: city.id } : previous)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not configure this city.')
    } finally { setBusy(false) }
  }

  const addCity = async () => {
    if (!draft || !newCityName.trim()) return
    setBusy(true)
    setError('')
    try {
      const city = await resolveCity(draft.countryCode, newCityName.trim())
      setCityOptions((previous) => {
        const existing = previous.find((item) => item.id === city.id)
        return existing ? previous : [...previous, { id: city.id, name: city.name, countryCode: city.countryCode, sources: ['LOCATION'] as HeroBannerCityOption['sources'] }].sort((a, b) => a.name.localeCompare(b.name))
      })
      setDraft((previous) => previous ? { ...previous, cityId: city.id } : previous)
      setNewCityName('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add this city.')
    } finally { setBusy(false) }
  }

  const chooseImage = async (slot: Slot, file?: File) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) { setError('Use a JPEG, PNG, WebP, or AVIF image.'); return }
    if (file.size > MAX_BYTES) { setError('Image files must be 15MB or smaller.'); return }
    try {
      const inspected = await inspectImage(file)
      const targetAspect = slot === 'desktop' ? 1920 / 450 : 750 / 400
      const aspect = inspected.width / inspected.height
      setError(Math.abs(aspect - targetAspect) / targetAspect > 0.2 ? `Warning: ${slot} image ratio is ${aspect.toFixed(2)}:1. The proposed artwork ratio is ${targetAspect.toFixed(2)}:1; confirm the crop with design.` : '')
      if (slot === 'desktop') setDesktopFile(inspected)
      else setMobileFile(inspected)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not inspect the image.')
    }
  }

  const removeImage = async (slot: Slot) => {
    if (!draft?.id) return
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/hero-banners/${draft.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removeSlot: slot }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message || 'Could not remove image.')
      setDraft((previous) => previous ? { ...previous, current: json.data } : previous)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove image.')
    } finally { setBusy(false) }
  }

  const save = async () => {
    if (!draft || busy) return
    if (draft.scope === 'CITY' && !draft.cityId) { setError('Select a city from the inventory list or add a city first.'); return }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/hero-banners', {
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
      const saved = await response.json()
      if (!response.ok || !saved.success) throw new Error(saved.message || 'Could not save banner details.')
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
      router.push('/admin/hero-banners')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the banner.')
    } finally { setBusy(false) }
  }

  if (loading || !draft) return <div className="mx-auto max-w-6xl py-16 text-sm text-white/60">{error || 'Loading banner editor…'}</div>

  const previewImage = previewMode === 'desktop'
    ? desktopFile?.url || draft.current?.desktopImageUrl
    : mobileFile?.url || draft.current?.mobileImageUrl || desktopFile?.url || draft.current?.desktopImageUrl

  return <div className="mx-auto max-w-[1500px] space-y-6 px-1 pb-10 text-white">
    <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => router.push('/admin/hero-banners')} aria-label="Back to hero banners" className="mt-0.5 rounded-md border border-white/10 p-2 text-white/65 hover:bg-white/[0.06]"><ArrowLeft size={17} /></button>
        <div><h1 className="text-2xl font-bold">{draft.id ? 'Edit hero banner' : 'New hero banner'}</h1><p className="mt-1 text-sm text-white/55">Set location context, content, and responsive artwork for the search hero.</p></div>
      </div>
      <div className="flex items-center gap-2"><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">{draft.current?.isActive ? 'Currently active' : 'Inactive draft'}</span><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-md bg-accent-yellow px-4 text-sm font-semibold text-dark-blue disabled:opacity-50"><ImagePlus size={15} />{busy ? 'Saving…' : 'Save configuration'}</button></div>
    </header>

    {error ? <div role="alert" className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</div> : null}

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
      <div className="space-y-6">
        <section className="space-y-4 border-b border-white/10 pb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Placement</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <GlobalDropdown label="Banner scope" value={draft.scope} onChange={(value) => { const scope = String(value) as Scope; setDraft({ ...draft, scope, category: scope !== 'CITY' && draft.category === 'GENERIC' ? 'BUY' : draft.category, cityId: '' }) }} options={[{ value: 'CITY', label: 'City' }, { value: 'COUNTRY', label: 'Country default' }, { value: 'GLOBAL', label: 'Global default' }]} disabled={Boolean(draft.id)} appearance="admin-dark" />
            <GlobalDropdown label="Search category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: String(value) as Category })} options={[{ value: 'BUY', label: 'Buy' }, { value: 'RENT', label: 'Rent' }, { value: 'PROJECTS', label: 'Projects' }, ...(draft.scope === 'CITY' ? [{ value: 'GENERIC', label: 'Generic city' }] : [])]} disabled={Boolean(draft.id)} appearance="admin-dark" />
            {draft.scope !== 'GLOBAL' ? <GlobalDropdown label="Country / market" value={draft.countryCode} onChange={(value) => setDraft({ ...draft, countryCode: String(value) as CountryCode, cityId: '' })} options={[{ value: 'INDIA', label: 'India' }, { value: 'UAE', label: 'United Arab Emirates' }]} disabled={Boolean(draft.id)} appearance="admin-dark" /> : null}
            {draft.scope === 'CITY' ? <div className="space-y-2"><GlobalDropdown label="City" value={selectedCity ? inventoryCityOptionValue(selectedCity) : ''} onChange={selectCity} options={cityDropdownOptions} placeholder="Search properties, projects, or cities" searchable disabled={Boolean(draft.id) || busy} appearance="admin-dark" />{selectedCity ? <p className="text-xs text-white/45">Available in: {selectedCity.sources.map((source) => SOURCE_LABEL[source]).join(' · ')}</p> : <p className="text-xs text-white/40">City options include canonical locations and cities found in active properties or published projects.</p>}<div className="flex gap-2"><input value={newCityName} onChange={(event) => setNewCityName(event.target.value)} placeholder="Add a city not listed" className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/35" /><button type="button" disabled={busy || !newCityName.trim()} onClick={() => void addCity()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs font-semibold text-white/75 disabled:opacity-40"><Plus size={14} /> Add city</button></div></div> : null}
          </div>
        </section>

        <section className="space-y-4 border-b border-white/10 pb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Content</h2>
          <label className="block text-sm font-medium text-white/75">Headline<input value={draft.headline} maxLength={200} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} placeholder="Explore Premium Properties in Mumbai" className="mt-2 h-11 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-accent-yellow/50" /></label>
          <label className="block text-sm font-medium text-white/75">Subheadline <span className="font-normal text-white/35">Optional</span><textarea value={draft.subheadline} maxLength={500} onChange={(event) => setDraft({ ...draft, subheadline: event.target.value })} rows={3} placeholder="Supporting copy appears as HTML over the image." className="mt-2 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 py-2.5 text-sm leading-6 text-white outline-none focus:border-accent-yellow/50" /></label>
        </section>

        <section className="space-y-5">
          <div><h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Responsive artwork</h2><p className="mt-1 text-xs text-white/40">Recommended targets are provisional. The server validates actual image bytes and dimensions.</p></div>
          {(['desktop', 'mobile'] as Slot[]).map((slot) => {
            const selected = slot === 'desktop' ? desktopFile : mobileFile
            const prefix = slot === 'desktop' ? 'desktop' : 'mobile'
            const existingUrl = slot === 'desktop' ? draft.current?.desktopImageUrl : draft.current?.mobileImageUrl
            const width = selected?.width || (slot === 'desktop' ? draft.current?.desktopWidth : draft.current?.mobileWidth)
            const height = selected?.height || (slot === 'desktop' ? draft.current?.desktopHeight : draft.current?.mobileHeight)
            const fileSize = selected?.file.size || (slot === 'desktop' ? draft.current?.desktopFileSize : draft.current?.mobileFileSize)
            const alt = slot === 'desktop' ? draft.desktopImageAlt : draft.mobileImageAlt
            return <div key={slot} className="grid gap-4 border-t border-white/[0.08] pt-4 md:grid-cols-[minmax(240px,0.9fr)_minmax(0,1fr)]">
              <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">{slot === 'desktop' ? 'Desktop hero' : 'Mobile hero'}</h3>{existingUrl && draft.id ? <button type="button" disabled={busy} onClick={() => void removeImage(slot)} className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-40"><Trash2 size={13} /> Remove</button> : null}</div>{selected || existingUrl ? <img src={selected?.url || existingUrl || ''} alt={alt || `${slot} banner preview`} className={`w-full rounded-md border border-white/10 object-cover ${slot === 'desktop' ? 'aspect-[4.27/1]' : 'aspect-[1.875/1]'}`} /> : <div className={`flex w-full items-center justify-center rounded-md border border-dashed border-white/15 bg-white/[0.025] text-xs text-white/35 ${slot === 'desktop' ? 'aspect-[4.27/1]' : 'aspect-[1.875/1]'}`}>{slot === 'desktop' ? 'Desktop image missing' : 'Optional mobile image'}</div>}</div>
              <div className="space-y-3"><p className="text-xs text-white/45">{width && height ? `${width} × ${height}px` : 'Dimensions appear after selection'} · {bytesLabel(fileSize)}{selected ? ` · ${selected.file.type.replace('image/', '').toUpperCase()}` : ''}</p><label className="block text-xs font-medium text-white/65">Alt text<input value={alt} maxLength={300} onChange={(event) => setDraft({ ...draft, [prefix === 'desktop' ? 'desktopImageAlt' : 'mobileImageAlt']: event.target.value })} placeholder={slot === 'desktop' ? 'Mumbai residential skyline' : 'Mobile view of Mumbai homes'} className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-accent-yellow/50" /></label><label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-white/15 px-3 text-xs text-white/65 hover:bg-white/[0.04]"><Upload size={15} />{selected || existingUrl ? 'Replace image' : 'Choose image'}<input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={(event) => void chooseImage(slot, event.target.files?.[0])} /></label>{progress[slot] !== null ? <div className="h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full bg-accent-yellow transition-[width]" style={{ width: `${progress[slot]}%` }} /></div> : null}{slot === 'mobile' && !existingUrl && !selected ? <p className="text-xs text-amber-200/70">Mobile image missing; the desktop image will be used.</p> : null}</div>
            </div>
          })}
          <p className="text-xs leading-5 text-white/40">Current proposal: desktop 1920 × 450, mobile 750 × 400. Keep headlines as HTML, not embedded in artwork. Confirm crop, focal point, and safe text area with design.</p>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Live composition preview</h2><p className="mt-1 text-xs text-white/40">Headline and supporting text render as page content.</p></div><div className="flex rounded-md border border-white/10 p-0.5"><button type="button" onClick={() => setPreviewMode('desktop')} aria-pressed={previewMode === 'desktop'} className={`rounded px-3 py-1.5 text-xs ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-white/45'}`}>Desktop</button><button type="button" onClick={() => setPreviewMode('mobile')} aria-pressed={previewMode === 'mobile'} className={`rounded px-3 py-1.5 text-xs ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-white/45'}`}>Mobile</button></div></div>
        <div className={`relative isolate flex w-full items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#102b40] px-5 py-8 text-center ${previewMode === 'desktop' ? 'aspect-[4.27/1]' : 'mx-auto max-w-[430px] aspect-[1.875/1]'}`}>{previewImage ? <img src={previewImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" /> : null}<div className="absolute inset-0 -z-10 bg-[#061523]/60" /><div className="max-w-3xl"><h3 className={`font-bold leading-tight text-white ${previewMode === 'desktop' ? 'text-2xl md:text-4xl' : 'text-xl'}`}>{draft.headline || 'Your headline appears here'}</h3><p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85">{draft.subheadline || 'Your optional supporting text appears here.'}</p></div></div>
        <p className="text-xs leading-5 text-white/40">Mobile uses its own art when uploaded. Otherwise, the desktop asset is reused.</p>
      </aside>
    </div>

    <footer className="sticky bottom-0 z-10 -mx-1 flex justify-between border-t border-white/10 bg-[#080e1a]/95 px-3 py-3 backdrop-blur sm:px-5"><button type="button" onClick={() => router.push('/admin/hero-banners')} className="h-10 rounded-md border border-white/10 px-4 text-sm text-white/70">Cancel</button><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-md bg-accent-yellow px-4 text-sm font-semibold text-dark-blue disabled:opacity-50"><ImagePlus size={15} />{busy ? 'Saving…' : 'Save configuration'}</button></footer>
  </div>
}