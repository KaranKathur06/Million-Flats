import Link from 'next/link'
import EcosystemHero from '../_components/EcosystemHero'
import EcosystemSection from '../_components/EcosystemSection'
import IconPoints from '../_components/IconPoints'
import HowItWorks from '../_components/HowItWorks'
import PartnerDirectoryPlaceholder from '../_components/PartnerDirectoryPlaceholder'
import ResourceList from '../_components/ResourceList'
import FinalCTA from '../_components/FinalCTA'
import MoversQuoteToolClient from './_components/MoversQuoteToolClient'
import { partnerRegistrationHref } from '@/lib/ecosystemPartners'

export const metadata = {
  title: 'Packers & Movers | Ecosystem Partners | MillionFlats',
  description:
    'Move in smoothly with verified packers and movers—get instant quote estimates, compare partners, and book through MillionFlats.',
}

export default function PackersMoversPage() {
  const slug = 'packers-movers' as const

  return (
    <div className="min-h-screen bg-gray-50">
      <EcosystemHero
        headline="Move In Smoothly. Start Your New Chapter."
        subheadline="Relocate with peace of mind. Our verified packers and movers handle everything—from careful packing to safe delivery—so you can focus on settling into your new home."
        ctaLabel="Get a Free Quote"
        ctaHref="#tools"
        imageSrc="/images/ecosystem/movers.jpg"
        imageAlt="Packers and movers"
      />

      <EcosystemSection title="Why Book Movers Through MillionFlats?">
        <IconPoints
          title="The MillionFlats Advantage"
          points={[
            { heading: 'Vetted & Insured Partners', text: 'Verified for license, insurance coverage, and reliable service history.' },
            { heading: 'Transparent, Upfront Pricing', text: 'All-inclusive quotes with no hidden fees.' },
            { heading: 'Professional Packing & Safety', text: 'High-quality materials and trained staff, including special items.' },
            { heading: 'Seamless Coordination', text: 'A single point of contact from survey to final delivery.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Comprehensive Moving Solutions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ t: 'Local Moves', d: 'Apartment shifting, office relocation, vehicle transportation.' },
            { t: 'Domestic Relocation', d: 'Long-distance moving, packing & unpacking, loading/unloading.' },
            { t: 'Specialized Needs', d: 'Delicate items, pet relocation, car/bike transportation.' },
            { t: 'General', d: 'Packing-only, moving-only, storage, insurance for goods.' }].map((c) => (
            <div key={c.t} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-sm font-semibold text-gray-900">{c.t}</div>
              <div className="mt-1 text-sm text-gray-600">{c.d}</div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="Featured Partner Showcase">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="h-10 w-28 rounded bg-gray-100" />
              <div className="mt-3 text-sm font-semibold text-gray-900">Mover Partner {i}</div>
              <div className="mt-1 text-sm text-gray-600">Fully Insured • 24/7 Support</div>
              <div className="mt-4">
                <Link href="#directory" className="text-sm font-semibold text-dark-blue hover:underline">
                  Book Now &amp; Get a Discount
                </Link>
              </div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="How It Works">
        <HowItWorks
          steps={[
            { title: 'Get a Quote', text: 'Use our calculator or request a survey and quote.' },
            { title: 'Compare & Book', text: 'Review transparent quotes and book your date online.' },
            { title: 'Pack & Move', text: 'Teams pack securely and transport safely.' },
            { title: 'Deliver & Unpack', text: 'Delivery on schedule with optional unpacking.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Interactive Tool & Partner Directory">
        <div id="tools" className="scroll-mt-24">
          <MoversQuoteToolClient />
        </div>

        <div className="mt-6" id="directory">
          <PartnerDirectoryPlaceholder
            filters={[
              { label: 'Type of Move', options: ['Local', 'Domestic'] },
              { label: 'Services', options: ['Packing', 'Car Transport', 'Storage', 'Unpacking'] },
              { label: 'Vehicle Size', options: ['Tempo', 'Small Truck', 'Large Truck'] },
            ]}
          />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Your Stress-Free Moving Guide">
        <ResourceList
          title="Educational Resources"
          items={[
            { title: 'Ultimate Pre-Move Checklist', description: 'Plan your move 8 weeks out.' },
            { title: 'How to Choose a Reliable Mover', description: 'What to verify before booking.' },
            { title: 'Packing Tips for Fragile Items', description: 'Avoid damage with simple best practices.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Your new home is waiting.">
        <FinalCTA
          headline="Your new home is waiting. Let a professional handle the move."
          primary={{ label: 'Book My Move Today', href: partnerRegistrationHref(slug) }}
          secondary={{ label: 'Download Our Moving Checklist', href: '#directory' }}
        />
      </EcosystemSection>
    </div>
  )
}
