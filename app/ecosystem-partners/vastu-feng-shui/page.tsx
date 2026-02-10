import Link from 'next/link'
import EcosystemHero from '../_components/EcosystemHero'
import EcosystemSection from '../_components/EcosystemSection'
import IconPoints from '../_components/IconPoints'
import HowItWorks from '../_components/HowItWorks'
import PartnerDirectoryPlaceholder from '../_components/PartnerDirectoryPlaceholder'
import ResourceList from '../_components/ResourceList'
import FinalCTA from '../_components/FinalCTA'
import { partnerRegistrationHref } from '@/lib/ecosystemPartners'

export const metadata = {
  title: 'Vastu / Feng Shui Consultants | Ecosystem Partners | MillionFlats',
  description:
    'Connect with authentic Vastu and Feng Shui consultants—verified by MillionFlats—to evaluate and improve harmony and wellbeing in your space.',
}

export default function VastuFengShuiPage() {
  const slug = 'vastu-feng-shui' as const

  return (
    <div className="min-h-screen bg-gray-50">
      <EcosystemHero
        headline="Create Harmony & Positive Energy in Your Space"
        subheadline="Make informed property decisions with confidence. Connect with authentic Vastu and Feng Shui consultants for expert evaluation and advice to enhance the wellbeing of your home or investment."
        ctaLabel="Consult an Expert"
        ctaHref="#directory"
        imageSrc="/images/ecosystem/vastu.jpg"
        imageAlt="Serene interior"
      />

      <EcosystemSection title="Why Consult Through MillionFlats?">
        <IconPoints
          title="The MillionFlats Advantage"
          points={[
            { heading: 'Vetted Authenticity', text: 'We verify consultants for knowledge, professional approach, and practical application.' },
            { heading: 'Clear Service Scope', text: 'Transparent consultation packages for different needs.' },
            { heading: 'Respectful Integration', text: 'Advice respects architectural plans and personal style.' },
            { heading: 'Seamless Coordination', text: 'Share floor plans/photos and connect with context-aware experts.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Guidance for Every Stage">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ t: 'Prospective Buyers/Tenants', d: 'Pre-purchase/pre-lease evaluation and floor plan analysis.' },
            { t: 'New Homeowners', d: 'Comprehensive audit and personalized recommendations.' },
            { t: 'NRIs/Investors', d: 'Remote consultation based on floor plans and videos.' },
            { t: 'General', d: 'Commercial evaluation and guidance for renovations/interiors.' }].map((c) => (
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
              <div className="mt-3 text-sm font-semibold text-gray-900">Consultant {i}</div>
              <div className="mt-1 text-sm text-gray-600">Classical Vastu Shastra</div>
              <div className="mt-4">
                <Link href="#directory" className="text-sm font-semibold text-dark-blue hover:underline">
                  View Profile &amp; Schedule
                </Link>
              </div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="How It Works">
        <HowItWorks
          steps={[
            { title: 'Define Your Query', text: 'Select your service and share basic details.' },
            { title: 'Get Matched', text: 'We connect you with a consultant aligned to your needs.' },
            { title: 'Consult & Receive Advice', text: 'Get a detailed consultation and guidance/report.' },
            { title: 'Implement with Confidence', text: 'Apply practical suggestions for harmony and energy flow.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Partner Directory & Filter">
        <div id="directory" className="scroll-mt-24">
          <PartnerDirectoryPlaceholder
            filters={[
              { label: 'Consultation Type', options: ['Vastu', 'Feng Shui'] },
              { label: 'Service Mode', options: ['In-Person', 'Virtual', 'Both'] },
              { label: 'Specialization', options: ['Residential', 'Commercial', 'Pre-Purchase'] },
            ]}
          />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Principles of Space & Harmony">
        <ResourceList
          title="Educational Resources"
          items={[
            { title: '5 Basic Vastu Principles', description: 'Simple principles for a welcoming home.' },
            { title: 'Feng Shui Tips for Abundance', description: 'Introductory tips for clarity and balance.' },
            { title: 'Modern Apartment Remedies', description: 'Practical guidance for contemporary spaces.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Invest in harmony and positive energy.">
        <FinalCTA
          headline="Invest in the harmony and positive energy of your living space."
          primary={{ label: 'Find My Consultant', href: partnerRegistrationHref(slug) }}
          secondary={{ label: 'Read Our Introductory Guide', href: '#directory' }}
        />
      </EcosystemSection>
    </div>
  )
}
