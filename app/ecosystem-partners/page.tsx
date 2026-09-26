import type { Metadata } from 'next'
import Link from 'next/link'
import MillionFlatsButton from '@/components/ui/MillionFlatsButton'
import TrackedServiceLink from '@/components/services/TrackedServiceLink'
import { ECOSYSTEM_CATEGORIES, categoryHref, partnerRegistrationHref } from '@/lib/ecosystemPartners'
import { ECOSYSTEM_PACKAGES } from '@/lib/services/segmentContent'

export const metadata: Metadata = {
  title: 'MillionFlats | Ecosystem Partners',
  description: 'Join a verified network of real estate ecosystem specialists across finance, legal, insurance, interiors, property services, and technology.',
  alternates: { canonical: '/ecosystem-partners' },
  openGraph: {
    title: 'Ecosystem Partners | MillionFlats',
    description: 'Explore 12 verified ecosystem verticals and connect with the MillionFlats property marketplace.',
    url: '/ecosystem-partners',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ecosystem Partners | MillionFlats',
    description: 'Explore 12 verified ecosystem verticals and connect with the MillionFlats property marketplace.',
  },
}

const partnerBenefits = [
  ['Qualified demand', 'Connect with people actively buying, selling, investing, moving, or improving a property.'],
  ['Verified trust', 'Build confidence with a reviewed partner profile and clear service coverage.'],
  ['Contextual discovery', 'Reach users in relevant category and property journeys, not a generic directory.'],
  ['Lead operations', 'Manage inquiries through MillionFlats partner tools and existing CRM/WhatsApp workflows.'],
]

const ecosystemSteps = [
  ['Discover', 'Customers identify a property need and explore relevant specialist categories.'],
  ['Compare', 'They review verified profiles, service coverage, experience, and fit.'],
  ['Connect', 'Qualified inquiries move into partner registration and lead workflows.'],
  ['Deliver', 'Partners serve the customer and build a measurable track record.'],
]

export default function EcosystemPartnersLandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">MillionFlats business ecosystem</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-dark-blue sm:text-6xl">Grow with the people shaping every property journey.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600">Join a verified network of specialists connecting with buyers, developers, owners, and investors at the moment they need trusted expertise.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MillionFlatsButton href="#categories" variant="primary" size="md" className="w-full sm:w-auto">Explore partner categories</MillionFlatsButton>
              <MillionFlatsButton href="#packages" variant="secondary" size="md" className="w-full sm:w-auto">View partner packages</MillionFlatsButton>
            </div>
          </div>
          <div className="border-l-2 border-amber-500 pl-6 lg:ml-auto lg:max-w-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">12 verified verticals</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-dark-blue">Property finance, professional services, home operations, and technology.</p>
            <p className="mt-3 text-sm leading-6 text-gray-600">A public gateway to category discovery, with partner registration and protected account tools remaining in their established flows.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">The network</p>
          <h2 className="mt-3 text-3xl font-bold text-dark-blue">What are MillionFlats ecosystem partners?</h2>
          <p className="mt-4 text-base leading-7 text-gray-600">They are verified specialists whose work supports a property decision or ownership journey: from financing and legal diligence to design, relocation, management, and connected-home technology.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {partnerBenefits.map(([title, description]) => (
            <article key={title} className="border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-dark-blue">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="categories" className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Find your vertical</p>
              <h2 className="mt-2 text-3xl font-bold text-dark-blue">12 partner categories</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-gray-600">Each category links to its dedicated discovery experience and partner application.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ECOSYSTEM_CATEGORIES.map((category) => (
              <article key={category.slug} className="flex min-h-36 flex-col border border-gray-200 bg-white p-5 transition-colors hover:border-dark-blue/40">
                <TrackedServiceLink href={categoryHref(category.slug)} eventName="ecosystem_category_view" eventParams={{ category: category.slug }} className="group flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-blue/40">
                  <h3 className="text-base font-semibold text-dark-blue group-hover:underline">{category.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-5 text-gray-600">{category.description}</p>
                  <span className="mt-4 text-sm font-semibold text-dark-blue">Explore category <span aria-hidden="true">→</span></span>
                </TrackedServiceLink>
                <TrackedServiceLink href={partnerRegistrationHref(category.slug)} eventName="partner_registration_start" eventParams={{ category: category.slug }} className="mt-3 self-start text-xs font-semibold text-gray-600 underline-offset-4 hover:text-dark-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-blue/40">
                  Apply in this category
                </TrackedServiceLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">How the ecosystem works</p>
          <h2 className="mt-2 text-3xl font-bold text-dark-blue">From discovery to delivery</h2>
        </div>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ecosystemSteps.map(([title, description], index) => (
            <li key={title} className="border-t-2 border-amber-500 bg-gray-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">0{index + 1}</p>
              <h3 className="mt-3 text-lg font-bold text-dark-blue">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="packages" className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Partner growth packages</p>
            <h2 className="mt-2 text-3xl font-bold text-dark-blue">Choose your growth path</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">Rates are shown as informational figures from the supplied commercial reference. The current MillionFlats partner program describes a performance-based, no-fee listing model; package purchases are not offered or activated by this page.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {ECOSYSTEM_PACKAGES.map((pkg) => (
              <article key={pkg.name} className={`flex flex-col border bg-white p-6 sm:p-8 ${pkg.featured ? 'border-dark-blue/50 ring-1 ring-dark-blue/10' : 'border-gray-200'}`}>
                {pkg.featured ? <p className="text-xs font-bold uppercase tracking-wide text-dark-blue">Recommended</p> : null}
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-gray-500">{pkg.subtitle}</p>
                <h3 className="mt-2 text-2xl font-bold text-dark-blue">{pkg.name}</h3>
                <ul className="mt-5 flex-1 divide-y divide-gray-100 border-y border-gray-100">
                  {pkg.features.map((feature) => <li key={feature} className="py-3 text-sm font-medium text-gray-700">{feature}</li>)}
                </ul>
                <p className="mt-5 text-2xl font-bold text-dark-blue">{pkg.price}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{pkg.taxNote}</p>
                <MillionFlatsButton href="#categories" variant={pkg.featured ? 'primary' : 'secondary'} size="md" className="mt-5 w-full">Select a category to apply</MillionFlatsButton>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Verification and trust</p>
          <h2 className="mt-3 text-3xl font-bold text-dark-blue">Credibility is built into the journey</h2>
        </div>
        <div>
          <p className="text-base leading-7 text-gray-600">Partner applications are reviewed through the existing verification workflow. Approved profiles can appear in the public category directories, while lead access and partner account tools remain within their established authenticated experiences.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/buy" className="text-sm font-semibold text-dark-blue underline-offset-4 hover:underline">Explore properties</Link>
            <Link href="/projects" className="text-sm font-semibold text-dark-blue underline-offset-4 hover:underline">Explore projects</Link>
            <Link href="/contact" className="text-sm font-semibold text-dark-blue underline-offset-4 hover:underline">Contact MillionFlats</Link>
          </div>
        </div>
      </section>

      <section className="bg-dark-blue text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Become a partner</p>
            <h2 className="mt-2 text-2xl font-bold">Start with the category that fits your business.</h2>
            <p className="mt-2 text-sm text-white/75">Select a vertical to review its partner information and application requirements.</p>
          </div>
          <MillionFlatsButton href="#categories" variant="secondary" size="md" className="shrink-0">
            Choose your category
          </MillionFlatsButton>
        </div>
      </section>
    </main>
  )
}
