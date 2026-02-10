import Link from 'next/link'
import EcosystemHero from '../_components/EcosystemHero'
import EcosystemSection from '../_components/EcosystemSection'
import IconPoints from '../_components/IconPoints'
import HowItWorks from '../_components/HowItWorks'
import PartnerDirectoryPlaceholder from '../_components/PartnerDirectoryPlaceholder'
import ResourceList from '../_components/ResourceList'
import FinalCTA from '../_components/FinalCTA'
import InsuranceToolsClient from './_components/InsuranceToolsClient'
import { partnerRegistrationHref } from '@/lib/ecosystemPartners'

export const metadata = {
  title: 'Property Insurance | Ecosystem Partners | MillionFlats',
  description:
    'Secure your property with confidence—compare curated insurance providers, calculate premium estimates, and request tailored quotes via MillionFlats.',
}

export default function PropertyInsurancePage() {
  const slug = 'property-insurance' as const

  return (
    <div className="min-h-screen bg-gray-50">
      <EcosystemHero
        headline="Secure Your Property. Insure with Confidence."
        subheadline="Find the right insurance for your home, rental, or investment through our curated network of trusted providers. Get tailored quotes and seamless support."
        ctaLabel="Get a Free Quote"
        ctaHref="#tools"
        imageSrc="/images/ecosystem/insurance.jpg"
        imageAlt="Property insurance"
      />

      <EcosystemSection title="Why Buy Insurance Through MillionFlats?">
        <IconPoints
          title="The MillionFlats Advantage"
          points={[
            { heading: 'Vetted Expertise', text: 'We partner only with reputable insurers and brokers known for fair policies and reliable claim settlement.' },
            { heading: 'Transparent Comparison', text: 'View clear policy summaries, coverage details, and premiums to compare apples-to-apples.' },
            { heading: 'Digital-First Convenience', text: 'Get instant quotes, buy online, and manage your policy through partners\' tech platforms.' },
            { heading: 'Dedicated Support', text: 'Partners provide dedicated support for MillionFlats customers during purchase and claims.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Insurance Solutions for Every Need">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ t: 'For Homeowners', d: 'Comprehensive structure & contents, fire, burglary, natural disaster coverage.' },
            { t: 'For Landlords/Investors', d: 'Rental property insurance, loss of rent, landlord liability.' },
            { t: 'For Tenants/Renters', d: "Tenant's contents insurance, personal liability cover." },
            { t: 'General', d: "Builder's risk, valuables floater, cyber protection for smart homes." }].map((c) => (
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
              <div className="mt-3 text-sm font-semibold text-gray-900">Insurance Partner {i}</div>
              <div className="mt-1 text-sm text-gray-600">Highest Claim Settlement Ratio</div>
              <div className="mt-4">
                <Link href="#directory" className="text-sm font-semibold text-dark-blue hover:underline">
                  View Plan Details &amp; Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="How It Works">
        <HowItWorks
          steps={[
            { title: 'Assess Your Needs', text: 'Use our guide or calculator to determine coverage.' },
            { title: 'Compare Quotes', text: 'Receive and compare tailored quotes from verified partners.' },
            { title: 'Select & Purchase', text: 'Choose the best plan and complete the digital purchase.' },
            { title: 'Stay Protected', text: 'Get documents and access support for future claims.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Interactive Tool & Partner Directory">
        <div id="tools" className="scroll-mt-24">
          <InsuranceToolsClient />
        </div>

        <div className="mt-6" id="directory">
          <PartnerDirectoryPlaceholder
            filters={[
              { label: 'Partner Type', options: ['Insurer', 'Broker', 'Aggregator'] },
              { label: 'Types of Insurance', options: ['Home', 'Fire', 'Burglary', 'Landlord'] },
              { label: 'Claim Settlement Ratio', options: ['>95%', '90–95%', '<90%'] },
            ]}
          />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Understanding Property Insurance">
        <ResourceList
          title="Educational Resources"
          items={[
            { title: "Sum Insured vs. Market Value", description: "What's the difference and why it matters." },
            { title: 'What’s Covered (and Not Covered)?', description: 'Know exclusions and add-ons before you buy.' },
            { title: 'How to File a Claim', description: 'A step-by-step guide to filing a claim.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Don’t wait for misfortune to strike.">
        <FinalCTA
          headline="Don’t wait for misfortune to strike. Protect your most valuable asset today."
          primary={{ label: 'Start My Quote Now', href: partnerRegistrationHref(slug) }}
          secondary={{ label: 'Download Our Insurance Checklist', href: '#directory' }}
        />
      </EcosystemSection>
    </div>
  )
}
