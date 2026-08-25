'use client'

import { useMemo, useState } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { MediaCard } from '@/components/media/MediaCard'
import { MediaUploadDialog } from '@/components/media/MediaUploadDialog'
import { PROPERTY_MEDIA_CATEGORY_OPTIONS, type PropertyMediaCategory } from '@/lib/propertyMedia'

type MediaItem = { id: string; category: string; url: string; altText?: string | null; position?: number; floorPlanTitle?: string | null; floorPlanBedroomCount?: number | null }

export default function ManualPropertyMediaManager({ propertyId, media, onChange, tour3dUrl, onTour3dUrlChange }: { propertyId: string; media: MediaItem[]; onChange: (media: MediaItem[]) => void; tour3dUrl?: string | null; onTour3dUrlChange: (value: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<PropertyMediaCategory | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [error, setError] = useState('')
  const [floorPlanBedroomCount, setFloorPlanBedroomCount] = useState('')
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
    <section className="rounded-2xl border border-white/[0.08] bg-[#0b1420] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Property Media</h2><p className="mt-1 text-sm text-white/45">Manage property images and media</p></div><button type="button" onClick={() => setUploadOpen(true)} className="self-start rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/30">+ Upload</button></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Property media categories"><button type="button" role="tab" aria-selected={selectedCategory === null} onClick={() => setSelectedCategory(null)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${selectedCategory === null ? 'border-amber-400/50 bg-amber-400/20 text-amber-300' : 'border-white/[0.08] bg-white/[0.04] text-white/60'}`}>All <span className="text-xs opacity-60">({images.length})</span></button>{categories.map((category) => { const count = images.filter((item) => item.category === category.value).length; return <button key={category.value} type="button" role="tab" aria-selected={selectedCategory === category.value} onClick={() => setSelectedCategory(category.value)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${selectedCategory === category.value ? 'border-amber-400/50 bg-amber-400/20 text-amber-300' : 'border-white/[0.08] bg-white/[0.04] text-white/60'}`}>{category.label} <span className="text-xs opacity-60">({count})</span></button> })}</div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
      {filtered.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-white/[0.12] p-10 text-center text-sm text-white/40">No media found in this category</div> : <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{filtered.map((item) => { const index = images.findIndex((candidate) => candidate.id === item.id); return <MediaCard key={item.id} media={{ id: item.id, mediaUrl: item.url, category: item.category, altText: item.altText }} isHero={item.category === 'COVER'} onPreview={() => undefined} onSetAsHero={() => void mutate(item.id, { category: 'COVER' })} onMoveUp={index > 0 ? () => void reorder(item.id, -1) : undefined} onMoveDown={index < images.length - 1 ? () => void reorder(item.id, 1) : undefined} onDelete={() => void remove(item.id)} /> })}</div>}
    </section>

    <section className="rounded-2xl border border-white/[0.08] bg-[#0b1420] p-5 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Floor Plans</h3><p className="mt-1 text-sm text-white/40">{media.filter((item) => item.category === 'FLOOR_PLANS').length} uploaded</p></div><div className="flex items-center gap-2"><input type="number" min="0" max="100" value={floorPlanBedroomCount} onChange={(event) => setFloorPlanBedroomCount(event.target.value)} placeholder="Bedrooms" aria-label="Floor plan bedrooms" className="h-10 w-24 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white" /><button type="button" onClick={() => { setSelectedCategory('FLOOR_PLANS'); setUploadOpen(true) }} className="rounded-lg bg-amber-400/20 px-3 py-2 text-sm text-amber-300">+ Upload</button></div></div><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{media.filter((item) => item.category === 'FLOOR_PLANS').map((item) => <MediaCard key={item.id} media={{ id: item.id, mediaUrl: item.url, category: item.category, label: item.floorPlanTitle || `${item.floorPlanBedroomCount ?? ''} Bedroom Floor Plan`, altText: item.altText }} onPreview={() => undefined} onSetAsHero={() => undefined} onDelete={() => void remove(item.id)} />)}</div></section>

    <section className="rounded-2xl border border-white/[0.08] bg-[#0b1420] p-5 text-white"><h3 className="text-lg font-semibold">Brochure & Video</h3><p className="mt-1 text-sm text-white/40">Dedicated property assets remain separate from the image library.</p><label className="mt-4 block text-sm text-white/60">3D Tour URL<input value={tour3dUrl || ''} onChange={(event) => onTour3dUrlChange(event.target.value)} placeholder="https://..." className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white" /></label></section>

    <MediaUploadDialog entityId={propertyId} title="Property" categories={categories} initialCategory={selectedCategory || undefined} presignEndpoint="/api/manual-properties/upload/presign" finalizeEndpoint="/api/manual-properties/upload/complete" buildPresignBody={(file, category) => ({ propertyId, category, filename: file.name, contentType: file.type, sizeBytes: file.size })} buildFinalizeBody={(file, category, s3Key) => ({ propertyId, category, url: s3Key, s3Key, mimeType: file.type, sizeBytes: file.size, altText: file.name, floorPlanTitle: category === 'FLOOR_PLANS' ? file.name : null, floorPlanBedroomCount: category === 'FLOOR_PLANS' && floorPlanBedroomCount ? Number(floorPlanBedroomCount) : null })} isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={(uploaded) => { if (uploaded) onChange([...media.filter((item) => item.id !== uploaded.id), uploaded]) }} />
  </div>
}
