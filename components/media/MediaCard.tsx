'use client'

import { useState } from 'react'

const CATEGORY_ICONS: Record<string, string> = {
  hero: '👑', COVER: '👑', other: '🗂️', OTHER: '🗂️', exterior: '🏘️', EXTERIOR: '🏘️',
  amenities: '✨', AMENITIES: '✨', lifestyle: '🌟', floor_plan: '📐', FLOOR_PLANS: '📐',
}

export type SharedMediaCardItem = {
  id: string
  mediaUrl: string
  category: string
  label?: string | null
  altText?: string | null
}

export function MediaCard({ media, isHero, onDelete, onSetAsHero, onPreview, onMoveUp, onMoveDown }: {
  media: SharedMediaCardItem
  isHero?: boolean
  onDelete: () => void
  onSetAsHero: () => void
  onPreview?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const [showActions, setShowActions] = useState(false)
  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] transition hover:border-white/[0.2]" onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <button type="button" className="relative block aspect-square w-full overflow-hidden bg-black/20" onClick={onPreview} aria-label="Preview media">
        <img src={media.mediaUrl} alt={media.altText || media.label || 'Property media'} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        {isHero ? <span className="absolute left-2 top-2 rounded-full border border-amber-400/30 bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300">★ Hero</span> : null}
      </button>
      <div className="p-3"><p className="truncate text-xs font-medium text-white/70">{media.label || 'Untitled'}</p><p className="mt-1 flex items-center gap-1 text-xs text-white/40"><span>{CATEGORY_ICONS[media.category] || '📁'}</span><span className="capitalize">{media.category.replaceAll('_', ' ')}</span></p></div>
      {showActions ? <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-2 bg-black/60 p-2 backdrop-blur"><button type="button" onClick={onPreview} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20">Preview</button>{!isHero ? <button type="button" onClick={onSetAsHero} className="rounded-lg bg-amber-400/20 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-400/30">Set Hero</button> : null}{onMoveUp ? <button type="button" onClick={onMoveUp} aria-label="Move media earlier" className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20">↑</button> : null}{onMoveDown ? <button type="button" onClick={onMoveDown} aria-label="Move media later" className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20">↓</button> : null}<button type="button" onClick={onDelete} className="rounded-lg bg-red-400/20 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-400/30">Delete</button></div> : null}
    </div>
  )
}
