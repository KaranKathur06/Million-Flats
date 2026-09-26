import Link from 'next/link'
import type { Metadata } from 'next'
import { SERVICE_NAV_ITEMS } from '@/lib/services/serviceNavigation'

export const metadata: Metadata = {
  title: 'Services | MillionFlats',
  description: 'Explore MillionFlats growth infrastructure for developers, agencies, agents, and ecosystem partners, alongside 3D Tours.',
  alternates: { canonical: '/services' },
}

export default function ServicesIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">MillionFlats Services</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl">
            Premium tools and services for buyers, agents, and partners.
          </p>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_NAV_ITEMS.map((service) => (
              <Link key={service.href} href={service.href} className="border border-gray-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-blue/40">
                <div className="text-dark-blue font-semibold">{service.label}</div>
                <div className="mt-2 text-sm text-gray-600">{service.label === '3D Tours' ? 'Interactive property walkthroughs and spatial experiences.' : 'Explore dedicated growth infrastructure for this MillionFlats ecosystem segment.'}</div>
                <div className="mt-5 text-sm font-semibold text-dark-blue">Explore <span aria-hidden="true">→</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
