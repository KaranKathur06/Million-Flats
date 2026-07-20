import React from 'react'

type Brand = { src?: string; alt?: string; href?: string }

export default function FeaturedBrands({ brands }: { brands: Brand[] }) {
  return (
    <section className="py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest uppercase border border-slate-200 shadow-sm mb-4">
            Trusted By
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">Featured Brands</h3>
          <p className="text-slate-600 mt-2">Leading manufacturers and brands we collaborate with.</p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-slate-100 shadow-sm">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 items-center justify-between">
            {brands && brands.length ? (
              brands.map((b, i) => (
                <div key={i} className="flex items-center justify-center p-2">
                  {b.href ? (
                    <a href={b.href} target="_blank" rel="noreferrer" className="block max-h-12">
                      {b.src ? <img src={b.src} alt={b.alt ?? `brand-${i}`} className="max-h-12 mx-auto object-contain" /> : <div className="h-10 w-24 bg-slate-100 rounded" />}
                    </a>
                  ) : (
                    b.src ? <img src={b.src} alt={b.alt ?? `brand-${i}`} className="max-h-12 mx-auto object-contain" /> : <div className="h-10 w-24 bg-slate-100 rounded" />
                  )}
                </div>
              ))
            ) : (
              // placeholder skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-center p-2">
                  <div className="h-10 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
