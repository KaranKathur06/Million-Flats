'use client'

import Image from 'next/image'
import { formatAEDCompact } from '@/lib/pricing'
import { getAiStatusStyles } from './statusStyles'

export interface ExplorerProject {
  id: string
  name: string
  slug: string
  city: string | null
  coverImage: string | null
  developer: { name: string } | null
  aiStatusLabel: string
  confidenceScore: number | null
  fairValue: number | null
  isAiFeatured: boolean
}

export function AIShieldProjectExplorer({
  projects,
  selectedSlug,
  onSelect,
  loading,
  discoveryMode,
}: {
  projects: ExplorerProject[]
  selectedSlug: string
  onSelect: (slug: string) => void
  loading: boolean
  discoveryMode?: boolean
}) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[200px] h-[220px] rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-600 mb-4">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">No projects match your filters</h3>
        <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
          {discoveryMode
            ? 'Published projects will appear here once added to MillionFlats. Try clearing filters or browse all off-plan projects.'
            : 'Try adjusting filters, or ask your admin to enable projects in AI Shield management.'}
        </p>
        <a
          href="/projects"
          className="inline-flex mt-5 px-5 py-2.5 text-sm font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50"
        >
          Browse all projects →
        </a>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Project Explorer</h2>
          <p className="text-sm text-gray-500">
            {projects.length} project{projects.length !== 1 ? 's' : ''} available
            {discoveryMode ? ' · showing all published while AI catalog builds' : ''}
          </p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
        {projects.map((p) => {
          const styles = getAiStatusStyles(p.aiStatusLabel)
          const selected = selectedSlug === p.slug
          const shortName = p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.slug)}
              className={`flex-shrink-0 w-[200px] snap-start text-left rounded-2xl border-2 overflow-hidden bg-white transition-all hover:shadow-lg ${
                selected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <div className="relative h-[100px] bg-gray-100">
                {p.coverImage ? (
                  <Image src={p.coverImage} alt={p.name} fill className="object-cover" sizes="200px" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
                )}
                {p.isAiFeatured && (
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded">
                    Featured
                  </span>
                )}
              </div>
              <div className="p-3.5">
                <p className="text-sm font-bold text-gray-900 leading-tight">{shortName}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{p.developer?.name}</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Fair Value</span>
                    <span className="font-semibold text-gray-800">
                      {p.fairValue ? formatAEDCompact(p.fairValue) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Confidence</span>
                    <span className="font-semibold text-gray-800">
                      {p.confidenceScore != null ? `${Math.round(p.confidenceScore)}%` : '—'}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles.badge}`}>
                  <span className={`w-1 h-1 rounded-full ${styles.dot}`} />
                  {p.aiStatusLabel}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
