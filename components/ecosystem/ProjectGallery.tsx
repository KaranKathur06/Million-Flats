import React from 'react'

type Pic = { src: string; alt?: string }

export default function ProjectGallery({ images }: { images: Pic[] }) {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-extrabold text-slate-900">Project Gallery</h3>
          <p className="text-slate-600 mt-2">Selected projects and installations from our partner network.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images && images.length ? (
            images.map((img, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
                <img src={img.src} alt={img.alt ?? `project-${i}`} className="w-full h-48 object-cover" />
              </div>
            ))
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm p-8">
                <div className="h-40 bg-slate-100 animate-pulse rounded" />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
