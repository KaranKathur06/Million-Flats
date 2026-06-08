'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import { mapStatusLabel } from '@/lib/aishield/projects'

interface AdminAiProject {
  id: string
  name: string
  slug: string
  city: string | null
  community: string | null
  countryIso2: string | null
  startingPrice: number | null
  developer: { id: string; name: string }
  aiShield: {
    isAiEnabled: boolean
    isAiFeatured: boolean
    aiStatus: string | null
    confidenceScore: number | null
    updatedAt?: string
  }
}

export default function AdminAiShieldPage() {
  const [items, setItems] = useState<AdminAiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [patching, setPatching] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai-shield/projects')
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setItems(json.items || [])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (projectId: string, data: { isAiEnabled?: boolean; isAiFeatured?: boolean }) => {
    setPatching(projectId)
    try {
      const res = await fetch('/api/admin/ai-shield/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...data }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Updated')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setPatching(null)
    }
  }

  const bulkEnableDamac = async () => {
    setBulkLoading(true)
    try {
      const res = await fetch('/api/admin/ai-shield/bulk-enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developerName: 'Damac',
          setFeaturedSlug: 'chelsea-residences',
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success(`Enabled ${json.enabled} Damac projects`)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Bulk import failed')
    } finally {
      setBulkLoading(false)
    }
  }

  const enabledCount = items.filter((i) => i.aiShield?.isAiEnabled).length

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Shield</h1>
          <p className="text-sm text-white/50 mt-1">
            Manage which projects appear on the AIShield Intelligence Platform ({enabledCount} enabled)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={bulkLoading}
            onClick={bulkEnableDamac}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {bulkLoading ? 'Importing…' : 'Bulk enable Damac projects'}
          </button>
          <Link
            href="/ai/shield"
            target="_blank"
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/20 text-white/80 hover:bg-white/5"
          >
            Open platform →
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white">AI Project Management</h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/[0.06]">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Developer</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">AI Status</th>
                  <th className="px-4 py-3 font-medium">AI Enabled</th>
                  <th className="px-4 py-3 font-medium">AI Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((p) => (
                  <tr key={p.id} className="text-white/80 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-white/40">{p.slug}</div>
                    </td>
                    <td className="px-4 py-3">{p.developer.name}</td>
                    <td className="px-4 py-3 text-white/50">
                      {[p.community, p.city].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {mapStatusLabel(p.aiShield?.aiStatus as never)}
                      {p.aiShield?.confidenceScore != null && (
                        <span className="text-white/40 ml-1">
                          ({Math.round(p.aiShield.confidenceScore)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.aiShield?.isAiEnabled ?? false}
                          disabled={patching === p.id}
                          onChange={(e) => patch(p.id, { isAiEnabled: e.target.checked })}
                          className="rounded border-white/20"
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="ai-featured"
                          checked={p.aiShield?.isAiFeatured ?? false}
                          disabled={patching === p.id || !p.aiShield?.isAiEnabled}
                          onChange={() => patch(p.id, { isAiFeatured: true })}
                          className="border-white/20"
                        />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-white/35">
        Only one project can be AI Featured (default on /ai/shield). Enabling a project warms the valuation cache automatically.
      </p>
    </div>
  )
}
