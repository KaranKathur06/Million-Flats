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
  title: 'Legal & Documentation | Ecosystem Partners | MillionFlats',
  description:
    'Secure your property transaction with verified legal partners for due diligence, agreement drafting, and registration—only on MillionFlats.',
}

export default function LegalDocumentationPage() {
  const slug = 'legal-documentation' as const

  return (
    <div className="min-h-screen bg-gray-50">
      <EcosystemHero
        headline="Secure Your Property Transaction with Expert Legal Support"
        subheadline="Connect with verified legal partners for due diligence, agreement drafting, registration, and peace of mind—only on MillionFlats."
        ctaLabel="Get a Legal Consultation"
        ctaHref="#directory"
        imageSrc="/images/ecosystem/legal.jpg"
        imageAlt="Legal consultation"
      />

      <EcosystemSection title="Why Choose Legal Partners Through MillionFlats?">
        <IconPoints
          title="The MillionFlats Advantage"
          points={[
            { heading: 'Vetted Expertise', text: 'Every firm is verified for real estate specialization and professional standing.' },
            { heading: 'Fixed-Fee Transparency', text: 'Clear pricing for common services with no hidden costs.' },
            { heading: 'Document Security & Tech', text: 'Partners use secure platforms for document handling and e-signing.' },
            { heading: 'Seamless Coordination', text: 'Your legal partner coordinates directly with your agent for a smooth process.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Comprehensive Legal Services for Every Step">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ t: 'For Buyers', d: 'Title verification, agreement review, due diligence, registration.' },
            { t: 'For Sellers', d: 'Drafting sale agreements, managing documentation.' },
            { t: 'For NRIs/Investors', d: 'PoA drafting, cross-border compliance, state regulations.' },
            { t: 'General', d: 'Legal opinion, dispute resolution support.' }].map((c) => (
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
              <div className="mt-3 text-sm font-semibold text-gray-900">Legal Firm {i}</div>
              <div className="mt-1 text-sm text-gray-600">Expertise in NRI Property Law</div>
              <div className="mt-4">
                <Link href="#directory" className="text-sm font-semibold text-dark-blue hover:underline">
                  View Firm Profile &amp; Contact
                </Link>
              </div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="How It Works">
        <HowItWorks
          steps={[
            { title: 'Describe Your Need', text: 'Select your service (e.g., Agreement Review for a Purchase).' },
            { title: 'Get Matched', text: 'We connect you with a suitable verified legal expert.' },
            { title: 'Consult & Engage', text: 'Discuss scope, timeline, and fixed fee.' },
            { title: 'Execute Securely', text: 'Documents are processed with full transparency.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Partner Directory & Filter">
        <div id="directory" className="scroll-mt-24">
          <PartnerDirectoryPlaceholder
            filters={[
              { label: 'Firm Type', options: ['Individual Advocate', 'Law Firm'] },
              { label: 'Jurisdiction Expertise', options: ['Mumbai', 'Delhi', 'Dubai', 'Pan-India'] },
              { label: 'Specialization', options: ['NRI', 'Commercial', 'Litigation', 'Registration'] },
            ]}
          />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Knowledge Centre: Legal Essentials">
        <ResourceList
          title="Educational Resources"
          items={[
            { title: 'Key Clauses in a Sale Agreement', description: 'Know what to review before signing.' },
            { title: 'Due Diligence Checklist for Buyers', description: 'A practical step-by-step checklist.' },
            { title: 'Understanding Stamp Duty & Registration', description: 'Understand costs and compliance.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Don’t let legal complexities risk your investment.">
        <FinalCTA
          headline="Don’t let legal complexities risk your investment."
          primary={{ label: 'Connect with a Legal Expert Today', href: partnerRegistrationHref(slug) }}
          secondary={{ label: 'Download Our Due Diligence Checklist', href: '#directory' }}
        />
      </EcosystemSection>
    </div>
  )
}
