'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatAEDCompact } from '@/lib/pricing'
import { mapStatusLabel } from '@/lib/aishield/projects'
import type { VerixShieldStatus } from '@prisma/client'

export interface AiShieldProjectDetail {
  id: string
  name: string
  slug: string
  city: string | null
  community: string | null
  countryIso2: string | null
  completionYear: number | null
  startingPrice: number | null
  goldenVisa: boolean
  coverImage: string | null
  developer: { id: string; name: string; slug: string | null; logo: string | null } | null
  aiShield?: {
    aiStatus: VerixShieldStatus | null
    confidenceScore: number | null
  } | null
}

export function AIShieldProjectSummary({ project }: { project: AiShieldProjectDetail }) {
  const location = [project.community, project.city].filter(Boolean).join(', ')
  const statusLabel = mapStatusLabel(project.aiShield?.aiStatus ?? null)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full md:w-72 aspect-[16/10] md:aspect-auto md:min-h-[180px] bg-gray-100 flex-shrink-0">
          {project.coverImage ? (
            <Image
              src={project.coverImage}
              alt={project.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 288px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No image</div>
          )}
        </div>
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Project Summary</p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{project.name}</h2>
              {project.developer && (
                <p className="text-sm text-gray-500 mt-1">{project.developer.name}</p>
              )}
              {location && <p className="text-sm text-gray-600 mt-0.5">{location}</p>}
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-100">
              {statusLabel}
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Completion</dt>
              <dd className="font-semibold text-gray-900 mt-0.5">
                {project.completionYear ? `Q4 ${project.completionYear}` : 'TBA'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Starting Price</dt>
              <dd className="font-semibold text-gray-900 mt-0.5">
                {project.startingPrice ? formatAEDCompact(project.startingPrice) : 'On request'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">AI Confidence</dt>
              <dd className="font-semibold text-gray-900 mt-0.5">
                {project.aiShield?.confidenceScore != null
                  ? `${Math.round(project.aiShield.confidenceScore)}%`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Golden Visa</dt>
              <dd className="font-semibold text-gray-900 mt-0.5">{project.goldenVisa ? 'Eligible' : '—'}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/projects/${project.slug}`}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              View project listing →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
