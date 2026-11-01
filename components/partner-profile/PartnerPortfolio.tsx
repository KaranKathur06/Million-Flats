'use client'

import { useState } from 'react'
import type { PartnerGalleryItem, PartnerPortfolioItem } from './types'

type PartnerPortfolioProps = {
  portfolios: PartnerPortfolioItem[]
  gallery?: PartnerGalleryItem[]
  partnerName: string
}

export default function PartnerPortfolio({
  portfolios,
  gallery = [],
  partnerName,
}: PartnerPortfolioProps) {
  const [activeType, setActiveType] = useState('all')
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  if (portfolios.length === 0 && gallery.length === 0) return null

  const types = ['all', ...Array.from(new Set(portfolios.map((p) => p.projectType).filter(Boolean)))] as string[]
  const filtered = activeType === 'all' ? portfolios : portfolios.filter((p) => p.projectType === activeType)

  return (
    <section id="partner-portfolio" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">Work showcase</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          Portfolio from {partnerName}
        </h2>
      </div>

      {portfolios.length > 0 && (
        <>
          {types.length > 2 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={activeType === type}
                  onClick={() => setActiveType(type)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition ${
                    activeType === type
                      ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[#1e3a5f]/40'
                  }`}
                >
                  {type === 'all' ? 'All projects' : type}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((project) => {
              const images = project.images.length > 0 ? project.images : [project.coverImage]
              return (
                <article
                  key={project.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    aria-label={`View ${project.projectName} images`}
                    onClick={() => setLightbox({ images, index: 0 })}
                    className="relative block aspect-[16/10] w-full overflow-hidden bg-slate-100"
                  >
                    <img
                      src={project.coverImage}
                      alt={project.projectName}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </button>
                  <div className="p-4">
                    <h3 className="text-base font-bold text-[#1e3a5f]">{project.projectName}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {project.location && <span>{project.location}</span>}
                      {project.projectSize && <span>{project.projectSize}</span>}
                      {project.style && <span>{project.style}</span>}
                    </div>
                    {project.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p>
                    )}
                    {(project.budgetRange || project.completionDate) && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
                        {project.budgetRange && (
                          <span className="font-semibold text-[#1e3a5f]">{project.budgetRange}</span>
                        )}
                        {project.completionDate && (
                          <span className="text-slate-500">Completed {project.completionDate}</span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {gallery.length > 0 && (
        <div className={portfolios.length > 0 ? 'mt-6' : ''}>
          <h3 className="mb-3 text-sm font-semibold text-[#1e3a5f]">Gallery</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((image) => (
              <button
                key={image.id}
                type="button"
                aria-label={`View ${image.caption || partnerName + ' gallery image'}`}
                onClick={() => setLightbox({ images: [image.imageUrl], index: 0 })}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={image.imageUrl}
                  alt={image.caption || `${partnerName} portfolio`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {image.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-left text-xs font-medium text-white">
                    {image.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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
