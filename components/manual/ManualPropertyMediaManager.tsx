'use client'

import { useMemo, useState } from 'react'
import { MediaCard } from '@/components/media/MediaCard'
import { MediaUploadDialog } from '@/components/media/MediaUploadDialog'
import { PROPERTY_MEDIA_CATEGORY_OPTIONS, type PropertyMediaCategory } from '@/lib/propertyMedia'

type MediaItem = { id: string; category: string; url: string; altText?: string | null; position?: number; floorPlanTitle?: string | null; floorPlanBedroomCount?: number | null }

export default function ManualPropertyMediaManager({ propertyId, media, onChange, tour3dUrl, onTour3dUrlChange }: { propertyId: string; media: MediaItem[]; onChange: (media: MediaItem[]) => void; tour3dUrl?: string | null; onTour3dUrlChange: (value: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<PropertyMediaCategory | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [error, setError] = useState('')
  const [floorPlanBedroomCount, setFloorPlanBedroomCount] = useState('')
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
  const images = useMemo(() => media.filter((item) => !['VIDEO', 'BROCHURE', 'FLOOR_PLANS'].includes(item.category)), [media])
  const filtered = selectedCategory ? images.filter((item) => item.category === selectedCategory) : images

  async function mutate(mediaId: string, patch: Record<string, unknown>) {
    setError('')
    const response = await fetch(`/api/manual-properties/media/${encodeURIComponent(mediaId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const result = await response.json()
    if (!response.ok || !result.success) setError(result.message || 'Unable to update media')
    else onChange(result.media || [])
  }

  async function remove(mediaId: string) {
    const response = await fetch(`/api/manual-properties/media/${encodeURIComponent(mediaId)}`, { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok || !result.success) setError(result.message || 'Unable to delete media')
    else onChange(result.media || [])
  }

  async function reorder(mediaId: string, direction: -1 | 1) {
    const index = images.findIndex((item) => item.id === mediaId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    const response = await fetch('/api/manual-properties/media/order', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId, mediaIds: next.map((item) => item.id) }) })
    if (!response.ok) setError('Unable to save media order')
    else onChange(next)
  }

  const categories = PROPERTY_MEDIA_CATEGORY_OPTIONS
  return <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 text-dark-blue shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Property Media</h2><p className="mt-1 text-sm text-gray-500">Manage property images and media</p></div><button type="button" onClick={() => setUploadOpen(true)} className="self-start rounded-lg bg-dark-blue px-4 py-2 text-sm font-medium text-white hover:bg-dark-blue/90">+ Upload</button></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Property media categories"><button type="button" role="tab" aria-selected={selectedCategory === null} onClick={() => setSelectedCategory(null)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${selectedCategory === null ? 'border-dark-blue bg-dark-blue text-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>All <span className="text-xs opacity-60">({images.length})</span></button>{categories.map((category) => { const count = images.filter((item) => item.category === category.value).length; return <button key={category.value} type="button" role="tab" aria-selected={selectedCategory === category.value} onClick={() => setSelectedCategory(category.value)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${selectedCategory === category.value ? 'border-dark-blue bg-dark-blue text-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>{category.label} <span className="text-xs opacity-60">({count})</span></button> })}</div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
      {filtered.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">No media found in this category</div> : <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{filtered.map((item) => { const index = images.findIndex((candidate) => candidate.id === item.id); return <MediaCard key={item.id} media={{ id: item.id, mediaUrl: item.url, category: item.category, altText: item.altText }} appearance="light" isHero={item.category === 'COVER'} onPreview={() => setPreviewMedia(item)} onSetAsHero={() => void mutate(item.id, { category: 'COVER' })} onMoveUp={index > 0 ? () => void reorder(item.id, -1) : undefined} onMoveDown={index < images.length - 1 ? () => void reorder(item.id, 1) : undefined} onDelete={() => void remove(item.id)} /> })}</div>}
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 text-dark-blue"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Floor Plans</h3><p className="mt-1 text-sm text-gray-500">{media.filter((item) => item.category === 'FLOOR_PLANS').length} uploaded</p></div><div className="flex items-center gap-2"><input type="number" min="0" max="100" value={floorPlanBedroomCount} onChange={(event) => setFloorPlanBedroomCount(event.target.value)} placeholder="Bedrooms" aria-label="Floor plan bedrooms" className="h-10 w-24 rounded-lg border border-gray-200 bg-white px-3 text-xs text-dark-blue" /><button type="button" onClick={() => { setSelectedCategory('FLOOR_PLANS'); setUploadOpen(true) }} className="rounded-lg bg-dark-blue px-3 py-2 text-sm text-white">+ Upload</button></div></div><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{media.filter((item) => item.category === 'FLOOR_PLANS').map((item) => <MediaCard key={item.id} media={{ id: item.id, mediaUrl: item.url, category: item.category, label: item.floorPlanTitle || `${item.floorPlanBedroomCount ?? ''} Bedroom Floor Plan`, altText: item.altText }} appearance="light" onPreview={() => undefined} onSetAsHero={() => undefined} onDelete={() => void remove(item.id)} />)}</div></section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 text-dark-blue"><h3 className="text-lg font-semibold">Brochure & Video</h3><p className="mt-1 text-sm text-gray-500">Dedicated property assets remain separate from the image library.</p><label className="mt-4 block text-sm text-gray-600">3D Tour URL<input value={tour3dUrl || ''} onChange={(event) => onTour3dUrlChange(event.target.value)} placeholder="https://..." className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-dark-blue" /></label></section>

    <MediaUploadDialog entityId={propertyId} title="Property" categories={categories} initialCategory={selectedCategory || undefined} appearance="light" presignEndpoint="/api/manual-properties/upload/presign" finalizeEndpoint="/api/manual-properties/upload/complete" buildPresignBody={(file, category) => ({ propertyId, category, filename: file.name, contentType: file.type, sizeBytes: file.size })} buildFinalizeBody={(file, category, s3Key) => ({ propertyId, category, url: s3Key, s3Key, mimeType: file.type, sizeBytes: file.size, altText: file.name, floorPlanTitle: category === 'FLOOR_PLANS' ? file.name : null, floorPlanBedroomCount: category === 'FLOOR_PLANS' && floorPlanBedroomCount ? Number(floorPlanBedroomCount) : null })} isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={(uploaded) => { if (uploaded) onChange([...media.filter((item) => item.id !== uploaded.id), uploaded]) }} />
    {previewMedia ? <div role="dialog" aria-modal="true" aria-label="Media preview" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewMedia(null)}><div className="relative max-h-[90vh] w-full max-w-5xl rounded-2xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreviewMedia(null)} aria-label="Close preview" className="absolute right-4 top-4 z-10 rounded-full bg-dark-blue px-3 py-1 text-lg text-white">×</button><div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-xl bg-gray-100 p-3"><img src={previewMedia.url} alt={previewMedia.altText || 'Property media preview'} className="max-h-[76vh] max-w-full object-contain" /></div><p className="px-2 pt-3 text-sm font-semibold text-dark-blue">{previewMedia.altText || 'Property media'}</p></div></div> : null}
  </div>
}
