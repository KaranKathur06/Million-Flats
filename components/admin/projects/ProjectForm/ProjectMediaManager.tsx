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
  gallery: number
  interior: number
  exterior: number
  amenities: number
  lifestyle: number
  floor_plan: number
}

interface ProjectMediaManagerProps {
  projectId: string
}

const CATEGORY_ICONS: Record<string, string> = {
  hero: '👑',
  gallery: '🖼️',
  interior: '🏠',
  exterior: '🏘️',
  amenities: '✨',
  lifestyle: '🌟',
  floor_plan: '📐',
}

export function ProjectMediaManager({ projectId }: ProjectMediaManagerProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [counts, setCounts] = useState<MediaCounts | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

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

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

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

  const filteredMedia = selectedCategory
    ? media.filter((m) => m.category === selectedCategory)
    : media

  const allCategories = [
    { value: null, label: 'All', icon: '📁', count: counts?.total },
    { value: 'hero', label: 'Hero', icon: '👑', count: counts?.hero },
    { value: 'gallery', label: 'Gallery', icon: '🖼️', count: counts?.gallery },
    { value: 'interior', label: 'Interior', icon: '🏠', count: counts?.interior },
    { value: 'exterior', label: 'Exterior', icon: '🏘️', count: counts?.exterior },
    { value: 'amenities', label: 'Amenities', icon: '✨', count: counts?.amenities },
    { value: 'lifestyle', label: 'Lifestyle', icon: '🌟', count: counts?.lifestyle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Category Tabs */}
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

      {/* Media Grid */}
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

      {/* Upload Dialog */}
      <MediaUploadDialog
        projectId={projectId}
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onComplete={() => loadMedia()}
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
      {/* Image */}
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

      {/* Label & Category */}
      <div className="p-3">
        <p className="text-xs font-medium text-white/70 truncate">
          {media.label || 'Untitled'}
        </p>
        <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
          <span>{CATEGORY_ICONS[media.category] || '📁'}</span>
          <span className="capitalize">{media.category}</span>
        </p>
      </div>

      {/* Action Buttons */}
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
