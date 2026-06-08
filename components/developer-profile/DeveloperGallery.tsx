'use client'

import { useState } from 'react'
import type { DeveloperGalleryItem } from './types'

type DeveloperGalleryProps = {
  gallery: DeveloperGalleryItem[]
  developerName: string
}

export default function DeveloperGallery({ gallery, developerName }: DeveloperGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState('all')

  if (gallery.length === 0) return null

  // Build categories
  const categories = ['all', ...Array.from(new Set(gallery.map((g) => g.category).filter(Boolean)))] as string[]
  const filtered = activeCategory === 'all' ? gallery : gallery.filter((g) => g.category === activeCategory)

  return (
    <section className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Gallery</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Explore {developerName}&apos;s portfolio, offices, and events.
          </p>
        </div>

        {/* Category tabs */}
        {categories.length > 2 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold capitalize transition-all ${
                  activeCategory === cat
                    ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Gallery grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setLightboxIndex(idx); setLightboxOpen(true) }}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 cursor-pointer"
            >
              <img
                src={item.imageUrl}
                alt={item.caption || `${developerName} gallery`}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <span className="text-white text-xs font-semibold drop-shadow-lg">{item.caption}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxOpen && filtered.length > 0 && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation */}
            {filtered.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => (p === 0 ? filtered.length - 1 : p - 1)) }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 text-white hover:bg-white/20 transition-all flex items-center justify-center"
                  aria-label="Previous"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => (p === filtered.length - 1 ? 0 : p + 1)) }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 text-white hover:bg-white/20 transition-all flex items-center justify-center"
                  aria-label="Next"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={filtered[lightboxIndex]?.imageUrl}
              alt={filtered[lightboxIndex]?.caption || 'Gallery'}
              className="max-h-[85vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Caption + counter */}
            <div className="absolute bottom-6 left-0 right-0 text-center" onClick={(e) => e.stopPropagation()}>
              {filtered[lightboxIndex]?.caption && (
                <p className="text-white text-sm font-medium mb-2">{filtered[lightboxIndex].caption}</p>
              )}
              <p className="text-white/50 text-xs">{lightboxIndex + 1} / {filtered.length}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
