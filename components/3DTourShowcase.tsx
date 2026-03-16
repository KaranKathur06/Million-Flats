'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

const galleryImages = [
  { src: '/3D tour page/01.jpg', title: 'Aerial City Visualization', category: 'prototype', desc: 'Satellite-scanned 3D cityscape with real-world terrain data' },
  { src: '/3D tour page/02.jpg', title: 'Stakeholder Collaboration', category: 'alignment', desc: 'Real-time 3D model review with cross-functional teams' },
  { src: '/3D tour page/03.jpg', title: 'Structural X-Ray View', category: 'construction', desc: 'Deep structural layer analysis in Unreal Engine' },
  { src: '/3D tour page/04.jpg', title: 'GIS Integration', category: 'prototype', desc: 'ArcGIS Maps SDK integration for geospatial data' },
  { src: '/3D tour page/05.jpg', title: 'Terrain & Zoning Analysis', category: 'construction', desc: 'Color-coded zoning data overlaid on 3D terrain' },
  { src: '/3D tour page/06.jpg', title: 'Infrastructure Planning', category: 'construction', desc: '3D city model with transport & infrastructure layers' },
  { src: '/3D tour page/07.jpg', title: 'Sales Suite Platform', category: 'market', desc: 'Interactive property sales with unit-level details' },
  { src: '/3D tour page/08.jpg', title: 'Port & Marine Planning', category: 'prototype', desc: 'Large-scale port development with master plan overlay' },
  { src: '/3D tour page/09.jpg', title: 'Logistics Master Plan', category: 'construction', desc: 'Comprehensive logistics center 3D visualization' },
  { src: '/3D tour page/10.jpg', title: 'Virtual Client Walkthrough', category: 'market', desc: 'Remote 3D interior tours with live screen sharing' },
]

const categories = [
  { key: 'all', label: 'All Projects', icon: '🌐' },
  { key: 'prototype', label: 'Rapid Prototype', icon: '🛰️' },
  { key: 'alignment', label: 'Collaboration', icon: '🔄' },
  { key: 'construction', label: 'Construction Clarity', icon: '🔬' },
  { key: 'market', label: 'Go to Market', icon: '🚀' },
]

export default function TourShowcase() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const filteredImages = activeCategory === 'all'
    ? galleryImages
    : galleryImages.filter(img => img.category === activeCategory)

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  const goNext = useCallback(() => {
    setLightboxIndex(prev => (prev + 1) % filteredImages.length)
  }, [filteredImages.length])

  const goPrev = useCallback(() => {
    setLightboxIndex(prev => (prev - 1 + filteredImages.length) % filteredImages.length)
  }, [filteredImages.length])

  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, closeLightbox, goNext, goPrev])

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  return (
    <>
      {/* ======== VIDEO SHOWCASE SECTION ======== */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIvPjwvc3ZnPg==')] opacity-60 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-[1240px] relative z-10">
          {/* Section header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold tracking-widest uppercase border border-amber-500/25 mb-6 shadow-sm backdrop-blur-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
              Platform Demo
            </div>
            <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white tracking-tight leading-[1.1] mb-4">
              See the platform <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">in action.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
              Watch how Meta-dology&apos;s 3D platform takes a project from concept to market — all four stages in one seamless demonstration.
            </p>
          </div>

          {/* Video container */}
          <div className="relative group">
            {/* Decorative glow behind video */}
            <div className="absolute -inset-3 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm bg-slate-900/50">
              {/* Top bar mimicking a browser */}
              <div className="flex items-center gap-2 px-5 py-3 bg-slate-800/80 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-slate-700/60 rounded-lg px-4 py-1 text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    meta-dology.com/demo
                  </div>
                </div>
              </div>

              {/* Wistia embed — loaded via iframe, no extra scripts */}
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src="https://fast.wistia.net/embed/iframe/yic3jnl6kn?seo=true&videoFoam=false"
                  title="Meta-dology 3D Platform Demo"
                  allow="autoplay; fullscreen"
                  frameBorder="0"
                  className="absolute top-0 left-0 w-full h-full"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Extra info chips below video */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            {[
              { icon: '🛰️', text: 'Stage 1 — Rapid Prototype' },
              { icon: '⚡', text: 'Stage 2 — Alignment' },
              { icon: '🔬', text: 'Stage 3 — Construction' },
              { icon: '🚀', text: 'Stage 4 — Go to Market' },
            ].map((chip, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[13px] text-slate-300 font-semibold backdrop-blur-sm hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 cursor-default"
              >
                <span>{chip.icon}</span>
                {chip.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== IMAGE GALLERY SECTION ======== */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-[1240px] relative z-10">
          {/* Section header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold tracking-widest uppercase border border-emerald-200 mb-6 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Portfolio Gallery
            </div>
            <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-dark-blue tracking-tight leading-[1.1] mb-4">
              Real projects. <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Real impact.</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
              From port master plans to luxury residences — explore how the platform transforms every stage of development.
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${
                  activeCategory === cat.key
                    ? 'bg-dark-blue text-white border-dark-blue shadow-lg shadow-slate-900/20 scale-105'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 shadow-sm'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((img, index) => (
              <div
                key={img.src}
                onClick={() => openLightbox(index)}
                className="group cursor-pointer rounded-[1.5rem] overflow-hidden bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:border-amber-200 transition-all duration-500 relative"
              >
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={img.src}
                    alt={img.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-5">
                    <div className="flex items-center gap-2 text-white text-sm font-bold">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                      View Full Size
                    </div>
                  </div>
                  {/* Category marker */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 border border-white/50 shadow-sm">
                    {categories.find(c => c.key === img.category)?.icon} {categories.find(c => c.key === img.category)?.label}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="font-extrabold text-dark-blue text-[15px] mb-1 group-hover:text-amber-600 transition-colors">{img.title}</h3>
                  <p className="text-[13px] text-slate-500 font-medium">{img.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== LIGHTBOX MODAL ======== */}
      {lightboxOpen && filteredImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close btn */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Nav prev */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          {/* Nav next */}
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          {/* Image */}
          <div
            className="relative w-[90vw] h-[75vh] max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={filteredImages[lightboxIndex].src}
              alt={filteredImages[lightboxIndex].title}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Bottom info bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-16 pb-8 px-8 text-center">
            <h3 className="text-white font-extrabold text-xl mb-1">{filteredImages[lightboxIndex].title}</h3>
            <p className="text-slate-400 text-sm font-medium">{filteredImages[lightboxIndex].desc}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {filteredImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i) }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i === lightboxIndex
                      ? 'bg-amber-400 scale-125 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : 'bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
