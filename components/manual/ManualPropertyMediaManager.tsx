'use client'

import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { PROPERTY_MEDIA_CATEGORY_OPTIONS } from '@/lib/propertyMedia'

type MediaItem = {
  id: string
  category: string
  url: string
  altText?: string | null
  position?: number
  mimeType?: string | null
  sizeBytes?: number | null
  floorPlanTitle?: string | null
  floorPlanBedroomCount?: number | null
  verificationStatus?: string | null
}

type UploadItem = { id: string; file: File; category: string; floorPlanTitle?: string; floorPlanBedroomCount?: number | null; status: 'uploading' | 'failed'; progress: number; error?: string }

const categoryLabel = (value: string) => PROPERTY_MEDIA_CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value.replaceAll('_', ' ')

function displayUrl(item: MediaItem) {
  return item.url || ''
}

export default function ManualPropertyMediaManager({
  propertyId,
  media,
  onChange,
  tour3dUrl,
  onTour3dUrlChange,
}: {
  propertyId: string
  media: MediaItem[]
  onChange: (media: MediaItem[]) => void
  tour3dUrl?: string | null
  onTour3dUrlChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [floorPlanBedroomCount, setFloorPlanBedroomCount] = useState('')

  const photos = useMemo(() => media.filter((item) => !['VIDEO', 'BROCHURE', 'FLOOR_PLANS'].includes(item.category)), [media])
  const video = media.find((item) => item.category === 'VIDEO')
  const brochure = media.find((item) => item.category === 'BROCHURE')
  const floorPlans = media.filter((item) => item.category === 'FLOOR_PLANS')
  const failedUploads = uploads.filter((item) => item.status === 'failed')

  const updateUploads = (id: string, patch: Partial<UploadItem>) => setUploads((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))

  async function uploadFile(item: UploadItem) {
    const category = item.category
    updateUploads(item.id, { status: 'uploading', progress: 1, error: undefined })
    try {
      const presignResponse = await fetch('/api/manual-properties/upload/presign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, category, filename: item.file.name, contentType: item.file.type, sizeBytes: item.file.size, floorPlanTitle: item.floorPlanTitle, floorPlanBedroomCount: item.floorPlanBedroomCount }),
      })
      const presign = await presignResponse.json()
      if (!presignResponse.ok || !presign?.uploadUrl) throw new Error(presign?.message || 'Unable to prepare upload')
      const { uploadToSignedUrl } = await import('@/lib/upload-client')
      await uploadToSignedUrl(String(presign.uploadUrl), item.file, (progress) => updateUploads(item.id, { progress }))
      const completeResponse = await fetch('/api/manual-properties/upload/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, category, url: presign.objectUrl, s3Key: presign.key, mimeType: item.file.type, sizeBytes: item.file.size, altText: item.file.name, floorPlanTitle: item.floorPlanTitle, floorPlanBedroomCount: item.floorPlanBedroomCount }),
      })
      const complete = await completeResponse.json()
      if (!completeResponse.ok || !complete?.success) throw new Error(complete?.message || 'Unable to save upload')
      onChange(complete.media || [])
      setUploads((current) => current.filter((upload) => upload.id !== item.id))
    } catch (value) {
      updateUploads(item.id, { status: 'failed', progress: 0, error: value instanceof Error ? value.message : 'Upload failed' })
    }
  }

  function addFiles(files: File[], category: string) {
    const next = files.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, category, floorPlanTitle: category === 'FLOOR_PLANS' ? file.name : undefined, floorPlanBedroomCount: category === 'FLOOR_PLANS' && floorPlanBedroomCount.trim() ? Number(floorPlanBedroomCount) : null, status: 'uploading' as const, progress: 0 }))
    setError('')
    setUploads((current) => [...current, ...next])
    next.forEach((item) => void uploadFile(item))
  }

  async function updateMedia(id: string, patch: Record<string, unknown>) {
    setBusyId(id); setError('')
    try {
      const response = await fetch(`/api/manual-properties/media/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      const result = await response.json()
      if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to update media')
      onChange(result.media || [])
    } catch (value) { setError(value instanceof Error ? value.message : 'Unable to update media') }
    finally { setBusyId('') }
  }

  async function removeMedia(item: MediaItem) {
    if (!window.confirm(`Remove ${item.category === 'VIDEO' ? 'this video' : item.category === 'BROCHURE' ? 'this brochure' : 'this photo'}?`)) return
    setBusyId(item.id); setError('')
    try {
      const response = await fetch(`/api/manual-properties/media/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to remove media')
      onChange(result.media || [])
    } catch (value) { setError(value instanceof Error ? value.message : 'Unable to remove media') }
    finally { setBusyId('') }
  }

  async function move(item: MediaItem, direction: -1 | 1) {
    const index = photos.findIndex((photo) => photo.id === item.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= photos.length) return
    const reordered = [...photos]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setBusyId(item.id)
    try {
      const response = await fetch('/api/manual-properties/media/order', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, mediaIds: reordered.map((photo) => photo.id) }),
      })
      const result = await response.json()
      if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to save media order')
      onChange(result.media || [])
    } catch (value) { setError(value instanceof Error ? value.message : 'Unable to save media order') }
    finally { setBusyId('') }
  }

  const hero = photos.find((item) => item.category === 'COVER')

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-dark-blue">Property Gallery</h2><p className="mt-1 text-sm text-gray-600">Upload photos once, then arrange and categorize them here.</p></div>
          <button type="button" onClick={() => inputRef.current?.click()} className="h-11 rounded-xl bg-dark-blue px-5 text-sm font-semibold text-white">Upload Photos</button>
          <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { addFiles(Array.from(event.target.files || []), 'EXTERIOR'); event.currentTarget.value = '' }} />
        </div>
        <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/')), 'EXTERIOR') }} className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-7 text-center text-sm text-gray-600">Drag &amp; drop photos here<br /><span className="text-xs">JPG / PNG / WEBP, multiple files supported</span></div>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        {uploads.length > 0 ? <div className="mt-4 space-y-2">{uploads.map((item) => <div key={item.id} className="rounded-xl border border-gray-200 p-3"><div className="flex justify-between gap-3 text-xs"><span className="truncate">{item.file.name}</span><span>{item.status === 'failed' ? 'Upload failed' : `${item.progress}%`}</span></div><div className="mt-2 h-1.5 rounded-full bg-gray-100"><div className={`h-full rounded-full ${item.status === 'failed' ? 'bg-red-500' : 'bg-dark-blue'}`} style={{ width: `${item.progress}%` }} /></div>{item.status === 'failed' ? <button type="button" onClick={() => void uploadFile(item)} className="mt-2 text-xs font-semibold text-dark-blue underline">Retry</button> : null}</div>)}</div> : null}
        {failedUploads.length > 1 ? <button type="button" onClick={() => failedUploads.forEach((item) => void uploadFile(item))} className="mt-3 text-sm font-semibold text-dark-blue underline">Retry Failed ({failedUploads.length})</button> : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-dark-blue">Gallery</h3><p className="text-xs text-gray-600">{photos.length} photos · {hero ? '1 hero' : 'No hero selected'}</p></div></div>
        {photos.length === 0 ? <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-7 text-center text-sm text-gray-600">No photos uploaded yet.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{photos.map((item, index) => <figure key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white"><button type="button" onClick={() => setPreviewIndex(index)} className="relative block aspect-[4/3] w-full bg-gray-100"><Image src={displayUrl(item)} alt={item.altText || 'Property photo'} fill className="object-cover" unoptimized /></button><figcaption className="space-y-2 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-dark-blue">{categoryLabel(item.category)}</span>{item.category === 'COVER' ? <span className="text-xs text-amber-600">★ Hero</span> : null}</div><GlobalDropdown value={item.category} onChange={(value) => void updateMedia(item.id, { category: String(value) })} options={PROPERTY_MEDIA_CATEGORY_OPTIONS} appearance="admin-light" dense showLabel={false} /><div className="flex flex-wrap gap-2 text-xs"><button type="button" onClick={() => void updateMedia(item.id, { category: 'COVER' })} disabled={item.category === 'COVER' || busyId === item.id} className="font-semibold text-dark-blue disabled:opacity-40">Set as Hero</button><button type="button" onClick={() => void move(item, -1)} disabled={index === 0 || busyId === item.id} aria-label="Move photo earlier" className="text-gray-600 disabled:opacity-40">Up</button><button type="button" onClick={() => void move(item, 1)} disabled={index === photos.length - 1 || busyId === item.id} aria-label="Move photo later" className="text-gray-600 disabled:opacity-40">Down</button><button type="button" onClick={() => void removeMedia(item)} disabled={busyId === item.id} className="font-semibold text-red-700 disabled:opacity-40">Delete</button></div></figcaption></figure>)}</div>}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <MediaAttachment title="Property Video" item={video} accept="video/mp4,video/webm" buttonLabel="Upload Video" onUpload={(files) => addFiles(files, 'VIDEO')} onRemove={removeMedia} />
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="font-semibold text-dark-blue">3D Tour</h3><p className="mt-1 text-xs text-gray-600">Optional hosted walkthrough URL.</p><input value={tour3dUrl || ''} onChange={(event) => onTour3dUrlChange(event.target.value)} placeholder="https://..." className="mt-4 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /><p className="mt-2 text-xs text-gray-500">{tour3dUrl ? (() => { try { const url = new URL(tour3dUrl); return url.protocol === 'http:' || url.protocol === 'https:' ? 'Valid URL' : 'Invalid URL' } catch { return 'Invalid URL' } })() : 'No tour added'}</p></div>
        <MediaAttachment title="Marketing Brochure" item={brochure} accept="application/pdf" buttonLabel="Upload PDF" onUpload={(files) => addFiles(files, 'BROCHURE')} onRemove={removeMedia} />
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-dark-blue">Floor Plans</h3><p className="mt-1 text-xs text-gray-600">Upload structured floor plans separately from the photo gallery.</p></div><label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-dark-blue">Upload Floor Plan<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf" className="hidden" onChange={(event) => { addFiles(Array.from(event.target.files || []), 'FLOOR_PLANS'); event.currentTarget.value = '' }} /></label></div><label className="mt-4 block max-w-xs text-xs font-semibold text-dark-blue">Bedrooms (optional)<input type="number" min="0" max="100" value={floorPlanBedroomCount} onChange={(event) => setFloorPlanBedroomCount(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm font-normal" /></label><div className="mt-4 flex flex-wrap gap-2">{floorPlans.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-xs"><span>{item.floorPlanTitle || item.url.split('/').pop() || 'Floor plan'}{item.floorPlanBedroomCount !== null && item.floorPlanBedroomCount !== undefined ? ` · ${item.floorPlanBedroomCount} Bedroom` : ''}</span><button type="button" onClick={() => void removeMedia(item)} className="font-semibold text-red-700">Delete</button></div>)}</div>{floorPlans.length === 0 ? <p className="mt-4 text-sm text-gray-600">No floor plans uploaded.</p> : null}</section>
      <p className="text-xs text-gray-500">Verification pending review. Media authenticity states are controlled by the backend.</p>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="font-semibold text-dark-blue">Media Summary</h3><p className="mt-2 text-sm text-gray-600">{photos.length} photos · {hero ? '1 hero' : '0 hero'} · {floorPlans.length} floor plans · {video ? '1 video' : '0 videos'} · {tour3dUrl ? '1 3D tour' : '0 tours'} · {brochure ? '1 brochure' : '0 brochures'}</p></section>

      {previewIndex !== null && photos[previewIndex] ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewIndex(null)}><div className="relative w-full max-w-4xl" onClick={(event) => event.stopPropagation()}><div className="relative aspect-video overflow-hidden rounded-xl bg-black"><Image src={displayUrl(photos[previewIndex])} alt={photos[previewIndex].altText || 'Property photo preview'} fill className="object-contain" unoptimized /></div><div className="mt-3 flex items-center justify-between text-sm text-white"><button type="button" disabled={previewIndex === 0} onClick={() => setPreviewIndex(previewIndex - 1)} className="disabled:opacity-40">Previous</button><span>{categoryLabel(photos[previewIndex].category)}{photos[previewIndex].category === 'COVER' ? ' · Hero' : ''}</span><button type="button" disabled={previewIndex === photos.length - 1} onClick={() => setPreviewIndex(previewIndex + 1)} className="disabled:opacity-40">Next</button><button type="button" onClick={() => setPreviewIndex(null)} className="font-semibold">Close</button></div></div></div> : null}
    </div>
  )
}

function MediaAttachment({ title, item, accept, buttonLabel, onUpload, onRemove }: { title: string; item?: MediaItem; accept: string; buttonLabel: string; onUpload: (files: File[]) => void; onRemove: (item: MediaItem) => void }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="font-semibold text-dark-blue">{title}</h3><label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-xl bg-dark-blue px-4 text-sm font-semibold text-white">{buttonLabel}<input type="file" accept={accept} className="hidden" onChange={(event) => { const files = Array.from(event.target.files || []); if (files.length) onUpload(files); event.currentTarget.value = '' }} /></label>{item ? <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 text-xs"><span className="truncate">{item.url.split('/').pop() || title}</span><button type="button" onClick={() => onRemove(item)} className="font-semibold text-red-700">Remove</button></div> : <p className="mt-4 text-sm text-gray-600">None uploaded.</p>}</div>
}
