'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

type Banner = {
  id: string
  imageUrl: string
  storageKey: string
  altText: string
  width: number | null
  height: number | null
  mimeType: string
  fileSize: number
  version: number
  updatedAt: string
}

type Category = {
  id: string
  slug: string
  title: string
  route: string
  banner: Banner | null
  configured: boolean
  status: 'ACTIVE' | 'MISSING'
}

type UploadFile = { file: File; url: string; width: number; height: number }

const MAX_BYTES = 15 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

function formatBytes(value: number) {
  if (!value) return '—'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function validateFile(file: File) {
  if (!ACCEPT.split(',').includes(file.type)) return 'Only JPG, PNG, WebP, and AVIF images are supported.'
  if (file.size > MAX_BYTES) return 'Banner images must be smaller than 15MB.'
  return ''
}

function inspectFile(file: File): Promise<UploadFile> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ file, url, width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file is not a readable image.')) }
    image.src = url
  })
}

function putWithProgress(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', url)
    request.setRequestHeader('Content-Type', file.type)
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)) }
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Upload failed with status ${request.status}`))
    request.onerror = () => reject(new Error('Network error during upload.'))
    request.onabort = () => reject(new Error('Upload cancelled.'))
    request.send(file)
  })
}

export default function EcosystemBannersClient() {
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState({ categories: 0, configured: 0, missing: 0, recentlyUpdated: 0, lastUpdated: null as string | null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('category')
  const [selected, setSelected] = useState<Category | null>(null)
  const [upload, setUpload] = useState<UploadFile | null>(null)
  const [altText, setAltText] = useState('')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<{ category: Category; mobile: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ status: filter })
      if (search.trim()) params.set('search', search.trim())
      const response = await fetch(`/api/admin/ecosystem-banners?${params}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message || 'Failed to load banners')
      setCategories(json.data)
      setStats(json.stats)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load banners')
    } finally { setLoading(false) }
  }, [filter, search])

  useEffect(() => { void load() }, [load])

  const chooseFile = async (file?: File) => {
    if (!file) return
    const validation = validateFile(file)
    if (validation) { setError(validation); return }
    try {
      const inspected = await inspectFile(file)
      const aspect = inspected.width / inspected.height
      if (inspected.width < 1280 || inspected.height < 800 || aspect < 1.35 || aspect > 1.8) {
        URL.revokeObjectURL(inspected.url)
        setError('This image does not meet the recommended ecosystem banner dimensions. Please upload a suitable hero image.')
        return
      }
      setError('')
      setUpload(inspected)
      if (!altText && selected) setAltText(`${selected.title} ecosystem partner banner`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not inspect image') }
  }

  const openUpload = (category: Category) => {
    setSelected(category)
    setUpload(null)
    setAltText(category.banner?.altText || `${category.title} ecosystem partner banner`)
    setProgress(0)
    setError('')
  }

  const closeUpload = () => {
    if (upload) URL.revokeObjectURL(upload.url)
    setSelected(null)
    setUpload(null)
    setBusy(false)
    setProgress(0)
  }

  const save = async () => {
    if (!selected || !upload || busy) return
    setBusy(true); setError(''); setProgress(0)
    try {
      const presignResponse = await fetch('/api/admin/ecosystem-banners/presign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: selected.id, fileName: upload.file.name, fileSizeBytes: upload.file.size, contentType: upload.file.type, width: upload.width, height: upload.height }) })
      const presign = await presignResponse.json()
      if (!presignResponse.ok || !presign.success) throw new Error(presign.message || 'Could not prepare upload')
      await putWithProgress(presign.uploadUrl, upload.file, setProgress)
      const finalizeResponse = await fetch('/api/admin/ecosystem-banners/finalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: selected.id, s3Key: presign.s3Key, fileName: upload.file.name, fileSizeBytes: upload.file.size, contentType: upload.file.type, altText, expectedVersion: selected.banner?.version ?? null }) })
      const finalized = await finalizeResponse.json()
      if (!finalizeResponse.ok || !finalized.success) throw new Error(finalized.message || 'Banner upload failed. Your existing banner has not been changed.')
      closeUpload()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Banner upload failed. Your existing banner has not been changed.')
      setBusy(false)
    }
  }

  const remove = async (category: Category) => {
    if (!category.banner || !window.confirm(`Remove the current banner for ${category.title}? The category page will use the default ecosystem banner.`)) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/admin/ecosystem-banners/${category.banner.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: category.banner.version }) })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message || 'Failed to remove banner')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to remove banner') } finally { setBusy(false) }
  }

  const visible = [...categories].sort((a, b) => sort === 'updated' ? new Date(b.banner?.updatedAt || 0).getTime() - new Date(a.banner?.updatedAt || 0).getTime() : sort === 'missing' ? Number(a.configured) - Number(b.configured) : a.title.localeCompare(b.title))

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold text-white">Ecosystem Banners</h1><p className="mt-1 text-sm text-white/60">Manage hero banners used across MillionFlats ecosystem partner category pages.</p></div>
      <Link href="/admin/ecosystem-partners/manage" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/80 hover:bg-white/5">Back to Partners</Link>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[[stats.categories, 'Categories'], [stats.configured, 'Configured'], [stats.missing, 'Missing'], [stats.recentlyUpdated, 'Updated today']].map(([value, label]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-2xl font-bold text-white">{value}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{label}</div></div>)}
    </div>
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 lg:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search category or slug" className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-accent-yellow/50" />
      <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"><option value="all">All</option><option value="configured">Configured</option><option value="missing">Missing</option></select>
      <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"><option value="category">Category name</option><option value="updated">Recently updated</option><option value="missing">Missing first</option></select>
    </div>
    {error ? <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error} <button onClick={() => void load()} className="ml-2 font-semibold underline">Retry</button></div> : null}
    {loading ? <div className="rounded-2xl border border-white/10 p-10 text-center text-sm text-white/50">Loading banners...</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((category) => <article key={category.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]">
      <div className="flex items-start justify-between gap-3 p-4"><div><h2 className="font-semibold text-white">{category.title}</h2><p className="mt-1 text-xs text-white/40">{category.route}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${category.configured ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>{category.status}</span></div>
      <div className="mx-4 aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">{category.banner?.imageUrl ? <img src={category.banner.imageUrl} alt={category.banner.altText} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.16em] text-white/35">No banner uploaded</div>}</div>
      <div className="p-4 text-xs text-white/50">{category.banner ? <>{category.banner.width || '—'} × {category.banner.height || '—'} · {category.banner.mimeType.replace('image/', '').toUpperCase()} · {formatBytes(category.banner.fileSize)}<br />Updated {formatDate(category.banner.updatedAt)}</> : <>Recommended: 2560 × 1600<br />Upload a category-specific hero image.</>}</div>
      <div className="flex flex-wrap gap-2 border-t border-white/10 p-4"><button onClick={() => openUpload(category)} className="rounded-lg bg-accent-yellow px-3 py-2 text-xs font-bold text-dark-blue">{category.banner ? 'Replace Image' : 'Upload Banner'}</button>{category.banner ? <><button onClick={() => setPreview({ category, mobile: false })} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80">Preview</button><button onClick={() => void remove(category)} disabled={busy} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300">Remove</button></> : null}</div>
    </article>)}</div>}
    {stats.lastUpdated ? <p className="text-xs text-white/35">Last updated: {formatDate(stats.lastUpdated)}</p> : null}
    {selected ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"><div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#101a2a] p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-white">{selected.banner ? 'Replace banner' : 'Upload banner'}</h2><p className="mt-1 text-sm text-white/55">{selected.title}</p></div><button onClick={closeUpload} className="text-white/60 hover:text-white">Close</button></div>{selected.banner ? <div className="mt-4 grid grid-cols-2 gap-3"><div><p className="mb-1 text-[10px] uppercase text-white/40">Current banner</p><img src={selected.banner.imageUrl} alt={selected.banner.altText} className="aspect-[16/10] w-full rounded-lg object-cover" /></div><div><p className="mb-1 text-[10px] uppercase text-white/40">New banner</p><div className="flex aspect-[16/10] items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-white/40">Select below</div></div></div> : null}<label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void chooseFile(event.dataTransfer.files[0]) }} className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center"><input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} /><span className="font-semibold text-white">Drop an image here or browse files</span><span className="mt-1 text-xs text-white/40">JPG, PNG, WebP, or AVIF · max 15MB · recommended 2560 × 1600</span></label>{upload ? <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3"><img src={upload.url} alt="Selected banner preview" className="aspect-[16/10] max-h-48 w-full rounded-lg object-cover" /><div className="mt-2 text-xs text-white/60">{upload.file.name} · {upload.width} × {upload.height} · {formatBytes(upload.file.size)} · {upload.file.type.replace('image/', '').toUpperCase()}</div><label className="mt-3 block text-xs font-semibold text-white/60">Alt text<input value={altText} onChange={(event) => setAltText(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 text-sm font-normal text-white outline-none" /></label></div> : null}{busy ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent-yellow transition-all" style={{ width: `${progress}%` }} /></div> : null}<div className="mt-5 flex justify-end gap-2"><button onClick={closeUpload} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75">Cancel</button><button onClick={() => void save()} disabled={!upload || busy} className="rounded-lg bg-accent-yellow px-4 py-2 text-sm font-bold text-dark-blue disabled:opacity-50">{busy ? `Uploading ${progress}%` : selected.banner ? 'Replace Banner' : 'Upload & Save'}</button></div></div></div> : null}
    {preview ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-[#101a2a] p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">Banner preview</h2><p className="text-sm text-white/50">{preview.category.title} · {preview.mobile ? 'Mobile crop' : 'Desktop crop'}</p></div><div className="flex gap-2"><button onClick={() => setPreview({ ...preview, mobile: !preview.mobile })} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75">{preview.mobile ? 'Desktop' : 'Mobile'}</button><button onClick={() => setPreview(null)} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75">Close</button></div></div><div className={`mx-auto mt-4 overflow-hidden rounded-xl border border-white/10 ${preview.mobile ? 'max-w-[390px]' : ''}`}><img src={preview.category.banner?.imageUrl || ''} alt={preview.category.banner?.altText || preview.category.title} className={`w-full object-cover ${preview.mobile ? 'aspect-[9/16]' : 'aspect-[16/7]'}`} /></div></div></div> : null}
  </div>
}