'use client'

import { PRODUCTS } from '@/config/branding'

const MODULES = [
  {
    key: 'index',
    product: PRODUCTS.INDEX,
    subtitle: 'Investment Forecasting',
    eta: 'Coming Q4 2026',
    icon: '📈',
    accent: 'border-violet-200 bg-violet-50',
    titleColor: 'text-violet-900',
  },
  {
    key: 'title',
    product: PRODUCTS.TITLE,
    subtitle: 'Legal Intelligence',
    eta: 'Coming Q4 2026',
    icon: '⚖️',
    accent: 'border-amber-200 bg-amber-50',
    titleColor: 'text-amber-900',
  },
  {
    key: 'view',
    product: PRODUCTS.VIEW,
    subtitle: 'Media Authenticity',
    eta: 'Coming Q1 2027',
    icon: '📷',
    accent: 'border-cyan-200 bg-cyan-50',
    titleColor: 'text-cyan-900',
  },
  {
    key: 'pro',
    product: PRODUCTS.PRO,
    subtitle: 'Agent Trust Engine',
    eta: 'Coming Q1 2027',
    icon: '🤝',
    accent: 'border-emerald-200 bg-emerald-50',
    titleColor: 'text-emerald-900',
  },
] as const

export function ComingSoonModules() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Verix Ecosystem</h2>
        <p className="text-sm text-gray-600 mt-1">
          The complete AI intelligence suite — launching on a phased roadmap
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MODULES.map((m) => (
          <article
            key={m.key}
            className={`rounded-2xl border-2 p-5 ${m.accent}`}
          >
            <span className="text-3xl" role="img" aria-hidden>
              {m.icon}
            </span>
            <h3 className={`text-base font-bold mt-3 ${m.titleColor}`}>{m.product.nameTM}</h3>
            <p className="text-sm font-medium text-gray-700 mt-1">{m.subtitle}</p>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">{m.product.description}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-800">{m.eta}</p>
          </article>
        ))}
      </div>
      <p className="mt-5 text-xs text-gray-500 text-center">
        AIShield™ is live today. Additional modules activate automatically as they ship.
      </p>
    </section>
  )
}
