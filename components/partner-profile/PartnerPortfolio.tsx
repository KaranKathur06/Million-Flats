'use client'

import { useState } from 'react'
import type { PartnerPortfolioItem } from './types'

type PartnerPortfolioProps = {
  portfolios: PartnerPortfolioItem[]
  partnerName: string
}

export default function PartnerPortfolio({ portfolios, partnerName }: PartnerPortfolioProps) {
  const [activeType, setActiveType] = useState('all')
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  if (portfolios.length === 0) return null

  const types = ['all', ...Array.from(new Set(portfolios.map((p) => p.projectType).filter(Boolean)))] as string[]
  const filtered = activeType === 'all' ? portfolios : portfolios.filter((p) => p.projectType === activeType)

  return (
    <section id="partner-portfolio" className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Portfolio Showcase</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Explore completed projects by {partnerName}.
          </p>
        </div>

        {types.length > 2 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold capitalize transition-all ${
                  activeType === type
                    ? 'border-dark-blue bg-dark-blue text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {type === 'all' ? 'All Projects' : type}
              </button>
            ))}
          </div>
        )}

        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((project) => {
            const images = project.images.length > 0 ? project.images : [project.coverImage]
            return (
              <article
                key={project.id}
                className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setLightbox({ images, index: 0 })}
                  className="relative block w-full"
                >
                  <img
                    src={project.coverImage}
                    alt={project.projectName}
                    className="w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                    loading="lazy"
                  />
                </button>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-dark-blue">{project.projectName}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    {project.location && <span>{project.location}</span>}
                    {project.projectSize && <span>{project.projectSize}</span>}
                    {project.style && <span>{project.style}</span>}
                  </div>
                  {project.budgetRange && (
                    <p className="mt-2 text-sm font-semibold text-gray-700">{project.budgetRange}</p>
                  )}
                  {project.completionDate && (
                    <p className="mt-1 text-xs text-gray-500">Completed {project.completionDate}</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightbox(null)
            if (e.key === 'ArrowRight') setLightbox((l) => l && { ...l, index: Math.min(l.index + 1, l.images.length - 1) })
            if (e.key === 'ArrowLeft') setLightbox((l) => l && { ...l, index: Math.max(l.index - 1, 0) })
          }}
          role="dialog"
          tabIndex={-1}
        >
          <img
            src={lightbox.images[lightbox.index]}
            alt="Portfolio"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((l) => l && { ...l, index: Math.max(l.index - 1, 0) })
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((l) => l && { ...l, index: Math.min(l.index + 1, l.images.length - 1) })
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
