'use client'

import Image from 'next/image'
import { formatAEDCompact } from '@/lib/pricing'
import { mapStatusLabel } from '@/lib/aishield/projects'
import { getAiStatusStyles } from './statusStyles'
import type { AIShieldStatus } from '@prisma/client'

export interface FeaturedProjectData {
  id: string
  name: string
  slug: string
  city: string | null
  community: string | null
  coverImage: string | null
  startingPrice: number | null
  developer: { name: string } | null
  aiShield?: {
    aiStatus: AIShieldStatus | null
    confidenceScore: number | null
    fairValue: number | null
  } | null
}

export function AIShieldFeaturedBanner({
  project,
  onSelect,
  selected,
}: {
  project: FeaturedProjectData
  onSelect: () => void
  selected?: boolean
}) {
  const statusLabel = mapStatusLabel(project.aiShield?.aiStatus ?? null)
  const styles = getAiStatusStyles(statusLabel)
  const location = [project.community, project.city].filter(Boolean).join(', ')

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left group rounded-2xl overflow-hidden border-2 transition-all ${selected ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-200 hover:border-blue-300 shadow-md'
        }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] bg-white">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[200px] bg-gray-100">
          {project.coverImage ? (
            <Image src={project.coverImage} alt={project.name} fill className="object-cover" sizes="280px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No image</div>
          )}
          <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded-md shadow">
            Featured Analysis
          </span>
        </div>
        <div className="p-5 sm:p-6 flex flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Admin Priority Project</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 group-hover:text-blue-700 transition-colors">
            {project.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {project.developer?.name}
            {location ? ` · ${location}` : ''}
          </p>
          <div className="mt-5 flex flex-wrap gap-4 sm:gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Fair Value</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {project.aiShield?.fairValue
                  ? formatAEDCompact(project.aiShield.fairValue)
                  : project.startingPrice
                    ? formatAEDCompact(project.startingPrice)
                    : 'Analyzing…'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Confidence</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {project.aiShield?.confidenceScore != null
                  ? `${Math.round(project.aiShield.confidenceScore)}%`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Status</p>
              <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                {statusLabel}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
            View full intelligence dashboard →
          </p>
        </div>
      </div>
    </button>
  )
}
