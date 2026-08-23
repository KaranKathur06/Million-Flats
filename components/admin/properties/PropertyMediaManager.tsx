'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PROPERTY_MEDIA_CATEGORIES, type PropertyMediaCategory } from '@/lib/propertyMedia'
import { useAdminAction } from '@/components/admin/AdminActionProvider'

type Media = { id: string; category: PropertyMediaCategory; url: string; altText?: string | null; position: number }

const labels: Record<PropertyMediaCategory, string> = { hero: 'Hero', interior: 'Interior', exterior: 'Exterior', amenities: 'Amenities', lifestyle: 'Lifestyle', floor_plan: 'Floor plan' }

export function PropertyMediaManager({ propertyId }: { propertyId: string }) {
  const { runAction } = useAdminAction()
  const [media, setMedia] = useState<Media[]>([])
  const [category, setCategory] = useState<PropertyMediaCategory>('hero')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/properties/${propertyId}/media`)
    const data = await res.json()
    if (data.success) setMedia(data.media || [])
  }, [propertyId])
  useEffect(() => { void refresh() }, [refresh])

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true); setError('')
    try {
      for (const file of Array.from(files)) {
        const presign = await fetch(`/api/admin/properties/${propertyId}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size, contentType: file.type, category }) })
        const signed = await presign.json()
        if (!presign.ok) throw new Error(signed.message || 'Unable to prepare upload')
        const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
        if (!put.ok) throw new Error(`Upload failed for ${file.name}`)
        const finalize = await fetch(`/api/admin/properties/${propertyId}/media`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size, contentType: file.type, category, s3Key: signed.s3Key }) })
        const saved = await finalize.json()
        if (!finalize.ok) throw new Error(saved.message || 'Unable to save uploaded media')
      }
      await refresh()
    } catch (err: any) { setError(err.message || 'Upload failed. Please retry.') }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  async function updateMedia(mediaId: string, patch: Record<string, unknown>) {
    setError('')
    const response = await fetch(`/api/admin/properties/${propertyId}/media/${mediaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await response.json()
    if (!response.ok) { setError(data.message || 'Unable to update media'); return }
    await refresh()
  }

  async function removeMedia(mediaId: string) {
    await runAction({
      title: 'Delete this media item?',
      description: 'This media item will be permanently removed from the property gallery.',
      confirmLabel: 'Delete Media',
      variant: 'danger',
      loadingTitle: 'Deleting Media',
      successTitle: 'Media Deleted',
      errorMessage: 'Unable to delete this media item.',
      mutation: async () => {
        const response = await fetch(`/api/admin/properties/${propertyId}/media/${mediaId}`, { method: 'DELETE' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Unable to delete media')
      },
      onSuccess: refresh,
    })
  }

  async function move(mediaId: string, direction: -1 | 1) {
    const index = media.findIndex((item) => item.id === mediaId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= media.length) return
    const next = [...media]; [next[index], next[target]] = [next[target], next[index]]
    setMedia(next)
    const response = await fetch(`/api/admin/properties/${propertyId}/media/order`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaIds: next.map((item) => item.id) }) })
    if (!response.ok) { setError('Unable to save media order'); await refresh() }
  }

  return <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-sm font-semibold text-white/80">Property Gallery</h2><p className="mt-1 text-xs text-white/40">Upload categorized media to S3. No image URLs are used.</p></div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-semibold text-black disabled:opacity-60">{uploading ? 'Uploading…' : 'Upload files'}</button>
      <input ref={inputRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void upload(event.target.files)} />
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">{PROPERTY_MEDIA_CATEGORIES.map((value) => <button key={value} type="button" onClick={() => setCategory(value)} className={`min-h-10 whitespace-nowrap rounded-lg border px-3 text-xs font-medium ${value === category ? 'border-amber-400/50 bg-amber-400/15 text-amber-300' : 'border-white/[0.08] text-white/55'}`}>{labels[value]}</button>)}</div>
    {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    {media.length === 0 ? <div className="rounded-xl border border-dashed border-white/[0.12] p-7 text-center text-sm text-white/35">No media uploaded yet. Select a category, then upload one or more images.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{media.map((item, index) => <figure key={item.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20"><img src={item.url} alt={item.altText || 'Property media'} className="aspect-square w-full object-cover" /><figcaption className="space-y-2 p-2"><p className="text-xs capitalize text-white/55">{labels[item.category]}</p><div className="flex flex-wrap gap-1"><button type="button" onClick={() => void updateMedia(item.id, { category: 'hero' })} className="rounded bg-amber-400/15 px-2 py-1 text-[10px] text-amber-300">Cover</button><button type="button" disabled={index === 0} onClick={() => void move(item.id, -1)} className="rounded bg-white/[0.07] px-2 py-1 text-[10px] text-white/65 disabled:opacity-30">←</button><button type="button" disabled={index === media.length - 1} onClick={() => void move(item.id, 1)} className="rounded bg-white/[0.07] px-2 py-1 text-[10px] text-white/65 disabled:opacity-30">→</button><button type="button" onClick={() => void removeMedia(item.id)} className="rounded bg-red-400/15 px-2 py-1 text-[10px] text-red-300">Delete</button></div></figcaption></figure>)}</div>}
  </section>
}
