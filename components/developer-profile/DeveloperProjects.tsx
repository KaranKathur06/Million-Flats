'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ResolvedImage from '@/components/media/ResolvedImage'
import { MEDIA_FALLBACKS } from '@/lib/media/resolveMedia'
import type { DeveloperProjectCard, DeveloperProfileData } from './types'

const INITIAL_VISIBLE = 4

type DeveloperProjectsProps = {
  projects: DeveloperProjectCard[]
  stats?: DeveloperProfileData['stats']
  developerName?: string
  developerSlug?: string
}

function ProjectCard({ project }: { project: DeveloperProjectCard }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <ResolvedImage
          src={project.image}
          alt={project.name}
          fallback={MEDIA_FALLBACKS.project}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        {project.tag ? (
          <span className="absolute left-3 top-3 rounded-full bg-dark-blue/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {project.tag}
          </span>
        ) : null}
        {project.goldenVisa ? (
          <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">
            Golden Visa
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 text-base font-bold text-dark-blue">{project.name}</h3>
        {project.location ? (
          <p className="mt-1.5 flex items-start gap-1 text-sm text-gray-500">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="line-clamp-2">{project.location}</span>
          </p>
        ) : null}

        <div className="mt-3 space-y-1">
          {project.startingPrice ? (
            <p className="text-sm font-bold text-amber-600">From {project.startingPrice}</p>
          ) : null}
          {project.status ? (
            <p className="text-xs font-medium text-gray-500">{project.status}</p>
          ) : null}
        </div>

        <Link
          href={`/projects/${project.slug}`}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-dark-blue text-sm font-semibold text-white transition-colors hover:bg-dark-blue/90 sm:mt-auto"
        >
          View Project
        </Link>
      </div>
    </article>
  )
}

export default function DeveloperProjects({
  projects,
  stats,
  developerName,
  developerSlug,
}: DeveloperProjectsProps) {
  const [expanded, setExpanded] = useState(false)

  const prices = useMemo(
    () =>
      projects
        .map((p) => {
          const match = p.startingPrice?.replace(/[^0-9]/g, '')
          return match ? Number(match) : 0
        })
        .filter((v) => v > 0),
    [projects]
  )
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null

  const visibleProjects = expanded ? projects : projects.slice(0, INITIAL_VISIBLE)
  const hiddenCount = Math.max(0, projects.length - INITIAL_VISIBLE)

  return (
    <section id="developer-projects" className="bg-white py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Portfolio</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">
              {developerName ? `Featured ${developerName} Projects` : 'Featured Projects'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              Signature developments from this verified developer — explore pricing, locations, and handover timelines.
            </p>
          </div>
          {projects.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-center sm:text-right">
              <p className="text-2xl font-bold text-dark-blue">{projects.length}</p>
              <p className="text-xs font-medium text-gray-500">Published Projects</p>
            </div>
          ) : null}
        </div>

        {projects.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Total Projects</p>
              <p className="text-lg font-bold text-dark-blue">{projects.length}</p>
            </div>
            {avgPrice ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">Avg. Starting Price</p>
                <p className="text-lg font-bold text-amber-600">AED {avgPrice.toLocaleString()}</p>
              </div>
            ) : null}
            {stats && stats.cities > 0 ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">Cities</p>
                <p className="text-lg font-bold text-dark-blue">{stats.cities}</p>
              </div>
            ) : null}
            {stats?.startingPriceRange ? (
              <div className="col-span-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 sm:col-span-1">
                <p className="text-xs font-medium text-gray-500">Price Range</p>
                <p className="text-sm font-bold text-dark-blue">{stats.startingPriceRange}</p>
              </div>
            ) : null}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
            No published projects available for this developer yet.
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-500 ${
                expanded ? 'opacity-100' : ''
              }`}
            >
              {visibleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {hiddenCount > 0 && !expanded ? (
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-dark-blue px-8 text-sm font-bold text-white shadow-md transition-all hover:bg-dark-blue/90 hover:shadow-lg"
                >
                  View All {projects.length} Projects
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {developerSlug ? (
                  <Link
                    href={`/developers/${developerSlug}#developer-projects`}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Or browse on projects page
                  </Link>
                ) : null}
              </div>
            ) : null}

            {expanded && hiddenCount > 0 ? (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-sm font-semibold text-gray-500 hover:text-dark-blue"
                >
                  Show fewer projects
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
