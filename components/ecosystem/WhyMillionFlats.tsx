import React from 'react'

type Benefit = { title: string; description: string }

export default function WhyMillionFlats({ benefits }: { benefits: Benefit[] }) {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1">
          <div className="rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-50 to-white p-6">
            <div className="w-full h-64 bg-[url('/images/ecosystem/why-mf-illustration.jpg')] bg-cover bg-center rounded-2xl" />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest uppercase border border-slate-200 mb-6 shadow-sm">
            Ecosystem Advantage
          </div>
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-slate-950 tracking-tight mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-emerald-600 to-teal-500">Why choose MillionFlats?</span>
          </h2>
          <p className="text-lg text-slate-700 mb-8">MillionFlats brings verified partners, transparent processes and end-to-end support so you can choose with confidence.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
                <h3 className="font-extrabold text-slate-900 text-[15px]">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
