'use client'

import { useCallback, useEffect, useState } from 'react'
import { GripVertical, Save, RotateCcw, Eye, Pin, PinOff, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  name: string
  slug: string
  listingPriority: number | null
  isPinned: boolean
  pinPriority: number | null
  isFeatured: boolean
  createdAt: string
  developer: { id: string; name: string }
}

interface ProjectListingManagementProps {
  initialCountry: string
  initialCity: string
  markets: Array<{ countryIso2: string; priority: number; isActive: boolean }>
  cities: Record<string, Array<{ countryIso2: string; cityName: string; priority: number; isActive: boolean }>>
}

export default function ProjectListingManagement({
  initialCountry,
  initialCity,
  markets,
  cities,
}: ProjectListingManagementProps) {
  const [country, setCountry] = useState(initialCountry)
  const [city, setCity] = useState(initialCity)
  const [projects, setProjects] = useState<Project[]>([])
  const [originalProjects, setOriginalProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)
  const [isDirty, setIsDirty] = useState(false)

  const pageCount = Math.ceil(total / pageSize)

  // Fetch projects for selected city
  const fetchProjects = useCallback(async (c: string, cy: string, page: number) => {
    if (!c || !cy) return

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        countryIso2: c,
        cityName: cy,
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      const res = await fetch(`/api/admin/projects/listing-management?${params}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to fetch projects')
      }

      const data = await res.json()
      setProjects(data.result.projects)
      setOriginalProjects(data.result.projects)
      setTotal(data.result.total)
      setCurrentPage(page)
      setIsDirty(false)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // Fetch on country/city/page change
  useEffect(() => {
    fetchProjects(country, city, currentPage)
  }, [country, city, currentPage, fetchProjects])

  // Handle drag and drop for reordering
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (index: number) => {
    if (draggedItem === null || draggedItem === index) {
      setDraggedItem(null)
      return
    }

    const newProjects = [...projects]
    const [moved] = newProjects.splice(draggedItem, 1)
    newProjects.splice(index, 0, moved)

    // Update priorities based on new order
    const updated = newProjects.map((p, i) => ({
      ...p,
      listingPriority: i + 1,
    }))

    setProjects(updated)
    setDraggedItem(null)
    setIsDirty(true)
  }

  // Toggle pin status
  const togglePin = (index: number) => {
    const updated = [...projects]
    updated[index] = {
      ...updated[index],
      isPinned: !updated[index].isPinned,
      pinPriority: !updated[index].isPinned ? 1 : null,
    }
    setProjects(updated)
    setIsDirty(true)
  }

  // Save reordering
  const handleSave = async () => {
    if (!isDirty) {
      toast.success('No changes to save')
      return
    }

    setSaving(true)
    try {
      const projectUpdates = projects.map((p) => ({
        projectId: p.id,
        newPriority: p.listingPriority || 1,
      }))

      const res = await fetch('/api/admin/projects/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryIso2: country,
          cityName: city,
          projects: projectUpdates,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to save reordering')
      }

      const data = await res.json()
      setOriginalProjects(projects)
      setIsDirty(false)
      toast.success(`Saved order for ${data.result.updated} projects`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save reordering')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Reset to original
  const handleReset = () => {
    setProjects(originalProjects)
    setIsDirty(false)
    toast.success('Reset to saved order')
  }

  // Get available cities for selected country
  const availableCities = cities[country] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Project Listing Order</h1>
        <p className="text-sm text-white/60">
          Drag to reorder projects within a city. Changes are saved transactionally.
        </p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Country</label>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
              setCity('')
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.10] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.20]"
          >
            <option value="">Select Country</option>
            {markets.map((m) => (
              <option key={m.countryIso2} value={m.countryIso2}>
                {m.countryIso2}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white">City</label>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value)
              setCurrentPage(1)
            }}
            disabled={!country}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.10] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.20] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select City</option>
            {availableCities.map((c) => (
              <option key={c.cityName} value={c.cityName}>
                {c.cityName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-white/40 animate-spin" />
            <p className="text-sm text-white/60">Loading projects...</p>
          </div>
        </div>
      )}

      {/* Projects List */}
      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">
              {total} project{total !== 1 ? 's' : ''} in {city}
              {isDirty && <span className="ml-2 text-yellow-400">● Unsaved changes</span>}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/40">
              Page {currentPage} of {pageCount}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.10] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.05]">
            {projects.map((project, index) => (
              <div
                key={project.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`grid grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-white/[0.02] cursor-grab active:cursor-grabbing transition-colors ${
                  draggedItem === index ? 'bg-white/[0.05]' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="col-span-1 flex items-center justify-center">
                  <GripVertical size={16} className="text-white/40" />
                </div>

                {/* Position */}
                <div className="col-span-1 text-sm font-medium text-white/60 px-2 py-1 rounded bg-white/[0.05] min-w-fit">
                  #{project.listingPriority ?? index + 1}
                </div>

                {/* Project Name */}
                <div className="col-span-5">
                  <p className="text-sm font-medium text-white truncate">{project.name}</p>
                  <p className="text-xs text-white/40 truncate">{project.developer.name}</p>
                </div>

                {/* Featured Badge */}
                {project.isFeatured && (
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Featured
                    </span>
                  </div>
                )}

                {/* Pin Button */}
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    onClick={() => togglePin(index)}
                    className={`p-2 rounded hover:bg-white/[0.05] transition-colors ${
                      project.isPinned ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'
                    }`}
                    title={project.isPinned ? 'Unpin' : 'Pin to top'}
                  >
                    {project.isPinned ? <Pin size={16} /> : <PinOff size={16} />}
                  </button>
                </div>

                {/* CreatedAt */}
                <div className="col-span-2 text-xs text-white/40 text-right truncate">
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded text-sm bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-white/60">
                {currentPage} / {pageCount}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                className="px-3 py-1 rounded text-sm bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && !error && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Eye size={32} className="text-white/20" />
            <p className="text-sm text-white/60">No projects found in {city || 'selected city'}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isDirty && !saving
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white/[0.05] text-white/60 cursor-not-allowed opacity-50'
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Order
          </button>

          <button
            onClick={handleReset}
            disabled={!isDirty || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isDirty && !saving
                ? 'bg-white/[0.05] hover:bg-white/[0.10] text-white'
                : 'bg-white/[0.05] text-white/40 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={16} />
            Reset
          </button>

          {isDirty && (
            <div className="ml-auto flex items-center gap-2 text-sm text-yellow-400">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Unsaved changes
            </div>
          )}
        </div>
      )}
    </div>
  )
}
