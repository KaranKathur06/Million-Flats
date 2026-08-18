'use client'

import { useEffect, useState, useCallback } from 'react'
import { MediaUploadDialog } from './MediaUploadDialog'

interface Media {
  id: string
  mediaUrl: string
  category: string
  label?: string
  sortOrder?: number
  s3Key?: string
  createdAt?: string
}

interface MediaCounts {
  total: number
  hero: number
  interior: number
  exterior: number
  amenities: number
  lifestyle: number
  floor_plan: number
}

interface ProjectMediaManagerProps {
  projectId: string
}

interface FloorPlanAsset {
  id: string
  unitTypeId?: string | null
  unitVariantId?: string | null
  unitType?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  size?: string | null
  price?: string | null
  imageUrl?: string | null
  s3Key?: string | null
}

interface FloorPlanStatusCard {
  unitTypeId: string
  title: string
  sortOrder?: number | null
  isUploaded: boolean
  plan: FloorPlanAsset | null
}

const CATEGORY_ICONS: Record<string, string> = {
  hero: '👑',
  interior: '🏠',
  exterior: '🏘️',
  amenities: '✨',
  lifestyle: '🌟',
  floor_plan: '📐',
}

export function buildFloorPlanStatusCards(unitTypes: any[] = [], floorPlans: any[] = []): FloorPlanStatusCard[] {
  const variantToUnitType = new Map<string, string>()
  for (const unitType of unitTypes) {
    for (const variant of unitType?.variants || []) {
      if (variant?.id) variantToUnitType.set(variant.id, unitType.id)
    }
  }

  const planByUnitTypeId = new Map<string, FloorPlanAsset>()
  for (const plan of floorPlans) {
    const candidateUnitTypeId = String(plan?.unitTypeId || plan?.unitType?.id || plan?.unitTypeId || '').trim() ||
      (plan?.unitVariantId ? variantToUnitType.get(String(plan.unitVariantId)) : null) ||
      null

    if (candidateUnitTypeId) {
      planByUnitTypeId.set(candidateUnitTypeId, plan)
    }
  }

  return (unitTypes || []).map((unitType) => ({
    unitTypeId: unitType.id,
    title: unitType.unitType || 'Unit Type',
    sortOrder: unitType.sortOrder ?? 0,
    isUploaded: Boolean(planByUnitTypeId.get(unitType.id)),
    plan: planByUnitTypeId.get(unitType.id) || null,
  })).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function ProjectMediaManager({ projectId }: ProjectMediaManagerProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [counts, setCounts] = useState<MediaCounts | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [floorPlanCards, setFloorPlanCards] = useState<FloorPlanStatusCard[]>([])

  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true)
      const url = selectedCategory
        ? `/api/admin/projects/${projectId}/media?category=${selectedCategory}`
        : `/api/admin/projects/${projectId}/media`

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setMedia(data.media || [])
        setCounts(data.counts || null)
      }
    } catch (err) {
      console.error('Failed to load media:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, selectedCategory])

  const loadFloorPlanCards = useCallback(async () => {
    try {
      const projectRes = await fetch(`/api/admin/projects/${projectId}`)
      const projectData = await projectRes.json()
      if (!projectData.success) return

      const unitTypes = Array.isArray(projectData.project?.unitTypes) ? projectData.project.unitTypes : []
      const floorPlans = Array.isArray(projectData.project?.floorPlans) ? projectData.project.floorPlans.map((plan: any) => {
        const matchedUnitTypeId = String(plan?.unitTypeId || '').trim() ||
          unitTypes.find((unitType: any) => (unitType?.variants || []).some((variant: any) => variant.id === plan?.unitVariantId))?.id ||
          null

        return { ...plan, unitTypeId: matchedUnitTypeId }
      }) : []

      setFloorPlanCards(buildFloorPlanStatusCards(unitTypes, floorPlans))
    } catch (err) {
      console.error('Failed to load floor plans:', err)
    }
  }, [projectId])

  useEffect(() => {
    void loadMedia()
    void loadFloorPlanCards()
  }, [loadMedia, loadFloorPlanCards])

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Delete this image?')) return

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/media/${mediaId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== mediaId))
        await loadMedia()
      }
    } catch (err) {
      console.error('Failed to delete media:', err)
    }
  }

  const handleDeleteFloorPlan = async (floorPlanId: string) => {
    if (!confirm('Delete this floor plan?')) return

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/media/${floorPlanId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadFloorPlanCards()
      }
    } catch (err) {
      console.error('Failed to delete floor plan:', err)
    }
  }

  const handleSetAsHero = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/media/${mediaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'hero' }),
      })

      if (res.ok) {
        await loadMedia()
      }
    } catch (err) {
      console.error('Failed to set as hero:', err)
    }
  }

  const handleFloorPlanUpload = async (unitTypeId: string, file: File) => {
    try {
      const presignRes = await fetch(`/api/admin/projects/${projectId}/media/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSizeBytes: file.size,
          contentType: file.type,
          category: 'floor_plan',
          unitTypeId,
        }),
      })

      const presignData = await presignRes.json()
      if (!presignRes.ok || !presignData.success) {
        throw new Error(presignData.message || 'Failed to prepare upload')
      }

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Floor plan upload failed')
      }

      const finalizeRes = await fetch(`/api/admin/projects/${projectId}/media/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3Key: presignData.s3Key,
          fileName: file.name,
          fileSizeBytes: file.size,
          category: 'floor_plan',
          unitTypeId,
        }),
      })

      const finalizeData = await finalizeRes.json()
      if (!finalizeRes.ok || !finalizeData.success) {
        throw new Error(finalizeData.message || 'Failed to finalize upload')
      }

      await loadFloorPlanCards()
    } catch (err) {
      console.error('Failed to upload floor plan:', err)
      alert(err instanceof Error ? err.message : 'Failed to upload floor plan')
    }
  }

  const filteredMedia = selectedCategory
    ? media.filter((m) => m.category === selectedCategory)
    : media

  const allCategories = [
    { value: null, label: 'All', icon: '📁', count: counts?.total },
    { value: 'hero', label: 'Hero', icon: '👑', count: counts?.hero },
    { value: 'interior', label: 'Interior', icon: '🏠', count: counts?.interior },
    { value: 'exterior', label: 'Exterior', icon: '🏘️', count: counts?.exterior },
    { value: 'amenities', label: 'Amenities', icon: '✨', count: counts?.amenities },
    { value: 'lifestyle', label: 'Lifestyle', icon: '🌟', count: counts?.lifestyle },
  ]

  const floorPlanSummary = {
    configured: floorPlanCards.length,
    uploaded: floorPlanCards.filter((card) => card.isUploaded).length,
    missing: floorPlanCards.filter((card) => !card.isUploaded).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Media Library</h2>
          <p className="text-sm text-white/40 mt-1">
            Manage project images and media ({counts?.total || 0} total)
          </p>
        </div>
        <button
          onClick={() => setUploadDialogOpen(true)}
          className="rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/30 transition"
        >
          + Upload
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {allCategories.map((cat) => (
          <button
            key={cat.value ?? 'all'}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === cat.value
                ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300'
                : 'bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            {cat.count !== undefined && (
              <span className="text-xs opacity-60">({cat.count})</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-white/40">Loading media...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <p className="text-white/40 mb-4">No media found in this category</p>
          <button
            onClick={() => setUploadDialogOpen(true)}
            className="rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/30"
          >
            Upload First Image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              isHero={item.category === 'hero'}
              onDelete={() => handleDeleteMedia(item.id)}
              onSetAsHero={() => handleSetAsHero(item.id)}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Floor Plans</h3>
            <p className="text-sm text-white/40">
              {floorPlanSummary.uploaded} / {floorPlanSummary.configured} uploaded
            </p>
          </div>
        </div>

        {floorPlanCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-black/10 p-6 text-sm text-white/50">
            No Unit Types have been configured yet. Add Unit Types first to upload their floor plans.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {floorPlanCards.map((card) => (
              <div key={card.unitTypeId} className="rounded-xl border border-white/[0.08] bg-black/10 p-4">
                <h4 className="mb-4 text-sm font-semibold text-white">{card.title}</h4>

                {card.plan ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      {card.plan.imageUrl ? (
                        <img src={card.plan.imageUrl} alt={card.title} className="h-36 w-full object-contain bg-white/5" />
                      ) : (
                        <div className="flex h-36 items-center justify-center text-sm text-white/40">PDF / Blueprint</div>
                      )}
                    </div>
                    <div className="space-y-2 text-xs text-white/60">
                      <p className="truncate">{card.plan.imageUrl?.split('/').pop() || 'floor-plan.pdf'}</p>
                      <p>{card.plan.size || 'Uploaded'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => card.plan?.imageUrl && window.open(card.plan.imageUrl, '_blank')}
                        className="rounded-lg border border-white/[0.08] px-2 py-1.5 text-xs text-white/70 hover:bg-white/[0.04]"
                      >
                        Preview
                      </button>
                      <label className="cursor-pointer rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/20">
                        Replace
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void handleFloorPlanUpload(card.unitTypeId, file)
                            event.target.value = ''
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => card.plan && void handleDeleteFloorPlan(card.plan.id)}
                        className="rounded-lg border border-red-400/20 bg-red-400/10 px-2 py-1.5 text-xs font-medium text-red-300 hover:bg-red-400/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-sm text-white/40">
                      Floor plan missing
                    </div>
                    <label className="inline-flex cursor-pointer rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/20">
                      Upload Floor Plan
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void handleFloorPlanUpload(card.unitTypeId, file)
                          event.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <MediaUploadDialog
        projectId={projectId}
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onComplete={() => {
          void loadMedia()
          void loadFloorPlanCards()
        }}
      />
    </div>
  )
}

interface MediaCardProps {
  media: Media
  isHero?: boolean
  onDelete: () => void
  onSetAsHero: () => void
}

function MediaCard({ media, isHero, onDelete, onSetAsHero }: MediaCardProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className="group relative rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.2] transition"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative aspect-square overflow-hidden bg-black/20">
        <img
          src={media.mediaUrl}
          alt={media.label || 'Project media'}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />

        {isHero && (
          <div className="absolute top-2 left-2 rounded-full bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300 border border-amber-400/30">
            👑 Hero
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs font-medium text-white/70 truncate">
          {media.label || 'Untitled'}
        </p>
        <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
          <span>{CATEGORY_ICONS[media.category] || '📁'}</span>
          <span className="capitalize">{media.category}</span>
        </p>
      </div>

      {showActions && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur flex items-center justify-center gap-2">
          {!isHero && (
            <button
              onClick={onSetAsHero}
              className="rounded-lg bg-amber-400/20 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-400/30"
            >
              Set Hero
            </button>
          )}
          <button
            onClick={onDelete}
            className="rounded-lg bg-red-400/20 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-400/30"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
