'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-100 text-amber-700' },
  PUBLISHED: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-600' },
}

const FILTER_OPTIONS = [
  { value: '', label: 'All Projects' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export default function DeveloperProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = async (status = '') => {
    setLoading(true)
    const q = status ? `?status=${status}` : ''
    const res = await fetch(`/api/developer/projects${q}`).catch(() => null)
    const data = await res?.json().catch(() => null)
    setProjects(data?.projects || [])
    setTotal(data?.total || 0)
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{total} project{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          href="/developer/projects/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-blue text-white rounded-xl text-sm font-semibold hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.value ? 'bg-dark-blue text-white shadow-lg shadow-dark-blue/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Projects Grid/Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-50 rounded mb-2 w-1/2" />
              <div className="h-3 bg-gray-50 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          <p className="text-gray-500 font-medium">No projects found</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter ? `No ${filter.toLowerCase().replace('_', ' ')} projects.` : 'Create your first project to get started.'}
          </p>
          {!filter && (
            <Link href="/developer/projects/create" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-dark-blue text-white rounded-xl text-sm font-semibold hover:bg-dark-blue/90 transition-all">
              + Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => {
            const s = STATUS_LABELS[project.status] || STATUS_LABELS.DRAFT
            return (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/developer/projects/${project.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </Link>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{project.name}</h3>
                {project.city && <p className="text-xs text-gray-400 mb-3">{project.city}</p>}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-50">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {project._count?.leads || 0} leads
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    {project._count?.projectUnitTypes || 0} unit types
                  </span>
                  <Link href={`/developer/projects/${project.id}`} className="ml-auto text-dark-blue hover:underline font-medium">Manage →</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
