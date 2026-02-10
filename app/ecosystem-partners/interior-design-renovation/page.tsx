import Link from 'next/link'
import EcosystemHero from '../_components/EcosystemHero'
import EcosystemSection from '../_components/EcosystemSection'
import IconPoints from '../_components/IconPoints'
import HowItWorks from '../_components/HowItWorks'
import PartnerDirectoryPlaceholder from '../_components/PartnerDirectoryPlaceholder'
import ResourceList from '../_components/ResourceList'
import FinalCTA from '../_components/FinalCTA'
import StyleQuizClient from './_components/StyleQuizClient'
import { partnerRegistrationHref } from '@/lib/ecosystemPartners'

export const metadata = {
  title: 'Interior Design & Renovation | Ecosystem Partners | MillionFlats',
  description:
    'Connect with vetted interior designers and renovation specialists—take a style quiz, explore portfolios, and start your project with MillionFlats.',
}

export default function InteriorDesignRenovationPage() {
  const slug = 'interior-design-renovation' as const

  return (
    <div className="min-h-screen bg-gray-50">
      <EcosystemHero
        headline="Design Your Dream Space. Bring It to Life."
        subheadline="From concept to completion, connect with top-tier interior designers and renovation experts vetted for creativity, reliability, and seamless execution."
        ctaLabel="Find My Designer"
        ctaHref="#tools"
        imageSrc="/images/ecosystem/interiors.jpg"
        imageAlt="Beautiful interior"
      />

      <EcosystemSection title="Why Hire Through MillionFlats?">
        <IconPoints
          title="The MillionFlats Advantage"
          points={[
            { heading: 'Vetted Expertise', text: 'Every partner is reviewed for design quality, project management skill, and client satisfaction.' },
            { heading: 'Transparent Pricing', text: 'Understand clear cost structures—fixed-fee, per-square-foot, or packaged deals—with upfront budgeting.' },
            { heading: 'Visualization Technology', text: 'Partners use 3D renders and virtual walkthroughs so you can see your design before execution.' },
            { heading: 'Seamless Coordination', text: 'Your designer manages contractors, sourcing, and timelines with a single point of contact.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Services for Every Vision and Budget">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ t: 'For New Homeowners', d: 'Full-home interior design, move-in ready packages, space planning.' },
            { t: 'For Upgraders/Renovators', d: 'Kitchen & bathroom remodels, living room makeovers, lighting design.' },
            { t: 'For NRIs/Investors', d: 'Turnkey design for rentals, staging for resale, remote project management.' },
            { t: 'General', d: 'Design consultation, modular kitchen & wardrobe, decor & styling.' }].map((c) => (
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
              <div className="h-24 w-full rounded-xl bg-gray-100" />
              <div className="mt-3 text-sm font-semibold text-gray-900">Design Firm {i}</div>
              <div className="mt-1 text-sm text-gray-600">Luxury Modern Minimalism</div>
              <div className="mt-4">
                <Link href="#directory" className="text-sm font-semibold text-dark-blue hover:underline">
                  View Portfolio &amp; Contact
                </Link>
              </div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="How It Works">
        <HowItWorks
          steps={[
            { title: 'Define Your Style', text: 'Take our quick style quiz and share your brief (room, budget, timeline).' },
            { title: 'Get Matched', text: 'We recommend designers whose style aligns with your vision.' },
            { title: 'Consult & Plan', text: 'Review concepts and quotes, then choose your partner.' },
            { title: 'Execute & Enjoy', text: 'Your designer manages the project from drawings to installation.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Interactive Tool & Partner Directory" description="Use tools to clarify your style and discover verified partners.">
        <div id="tools" className="scroll-mt-24">
          <StyleQuizClient />
        </div>

        <div className="mt-6" id="directory">
          <PartnerDirectoryPlaceholder
            filters={[
              { label: 'Design Style', options: ['Modern', 'Traditional', 'Scandinavian', 'Minimal', 'Luxury'] },
              { label: 'Service Type', options: ['Full-Service', 'Consultation', 'Renovation', 'Modular'] },
              { label: 'Budget Range', options: ['Value', 'Mid', 'Premium', 'Luxury'] },
            ]}
          />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Inspiration & Planning Hub">
        <ResourceList
          title="Educational Resources"
          items={[
            { title: 'How to Budget for a Home Renovation', description: 'A practical guide to planning and cost control.' },
            { title: 'Modular vs. Carpentry: Pros & Cons', description: 'Choose the right build approach for your home.' },
            { title: '5 Questions to Ask Your Interior Designer', description: 'Evaluate partners confidently.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Your dream home is a great partnership away.">
        <FinalCTA
          headline="Your dream home is a great partnership away."
          primary={{ label: 'Start My Project', href: partnerRegistrationHref(slug) }}
          secondary={{ label: 'Download Our Pre-Design Checklist', href: '#directory' }}
        />
      </EcosystemSection>
    </div>
  )
}
