'use client'

import { useState } from 'react'

interface Tag {
  id: string
  name: string
  slug: string
  _count?: { blogTags: number }
}

export function TagManager({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create tag')
      }

      // Only add if it's a new tag (API returns existing if duplicate)
      const exists = tags.some(t => t.id === data.data.id)
      if (!exists) {
        setTags(prev => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setNewTagName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Tag Form */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">Create New Tag</h2>
        <form onSubmit={handleCreateTag} className="flex gap-3">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Enter tag name (e.g., Market Trends, Investment Tips)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
            disabled={isCreating}
          />
          <button
            type="submit"
            disabled={isCreating || !newTagName.trim()}
            className="h-10 px-5 rounded-xl text-[13px] font-bold transition-all duration-200 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* Tags List */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">Existing Tags</h2>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] transition-all duration-200"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-white/40">({tag._count?.blogTags || 0})</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-sm text-white/40">No tags created yet</p>
            <p className="text-xs text-white/30 mt-1">Create your first tag above</p>
          </div>
        )}
      </div>
    </div>
  )
}
