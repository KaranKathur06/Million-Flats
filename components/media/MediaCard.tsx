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

export function MediaCard({ media, isHero, onDelete, onSetAsHero, onPreview, onMoveUp, onMoveDown, appearance = 'dark' }: {
  media: SharedMediaCardItem
  isHero?: boolean
  onDelete: () => void
  onSetAsHero: () => void
  onPreview?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  appearance?: 'dark' | 'light'
}) {
  const [showActions, setShowActions] = useState(false)
  const light = appearance === 'light'
  return (
    <div className={`group relative overflow-hidden rounded-lg border transition ${light ? 'border-gray-200 bg-white hover:border-gray-300' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2]'}`} onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <button type="button" className={`relative block aspect-square w-full overflow-hidden ${light ? 'bg-gray-100' : 'bg-black/20'}`} onClick={onPreview} aria-label="Preview media">
        <img src={media.mediaUrl} alt={media.altText || media.label || 'Property media'} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        {isHero ? <span className="absolute left-2 top-2 rounded-full border border-amber-400/30 bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300">★ Hero</span> : null}
      </button>
      <div className="p-3"><p className={`truncate text-xs font-medium ${light ? 'text-dark-blue' : 'text-white/70'}`}>{media.label || 'Untitled'}</p><p className={`mt-1 flex items-center gap-1 text-xs ${light ? 'text-gray-500' : 'text-white/40'}`}><span>{CATEGORY_ICONS[media.category] || '📁'}</span><span className="capitalize">{media.category.replaceAll('_', ' ')}</span></p></div>
      {showActions ? <div className={`absolute inset-0 flex flex-wrap items-center justify-center gap-2 p-2 backdrop-blur ${light ? 'bg-white/75' : 'bg-black/60'}`}><button type="button" onClick={onPreview} className={`rounded-lg px-2 py-1 text-xs font-medium ${light ? 'bg-dark-blue text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>Preview</button>{!isHero ? <button type="button" onClick={onSetAsHero} className="rounded-lg bg-amber-400/80 px-2 py-1 text-xs font-medium text-dark-blue">Set Hero</button> : null}{onMoveUp ? <button type="button" onClick={onMoveUp} aria-label="Move media earlier" className={`rounded-lg px-2 py-1 text-xs ${light ? 'bg-gray-200 text-dark-blue' : 'bg-white/10 text-white'}`}>↑</button> : null}{onMoveDown ? <button type="button" onClick={onMoveDown} aria-label="Move media later" className={`rounded-lg px-2 py-1 text-xs ${light ? 'bg-gray-200 text-dark-blue' : 'bg-white/10 text-white'}`}>↓</button> : null}<button type="button" onClick={onDelete} className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Delete</button></div> : null}
    </div>
  )
}
