import Link from 'next/link'
import EcosystemHero from '../_components/EcosystemHero'
import EcosystemSection from '../_components/EcosystemSection'
import IconPoints from '../_components/IconPoints'
import HowItWorks from '../_components/HowItWorks'
import PartnerDirectoryPlaceholder from '../_components/PartnerDirectoryPlaceholder'
import ResourceList from '../_components/ResourceList'
import FinalCTA from '../_components/FinalCTA'
import ManagementYieldToolClient from './_components/ManagementYieldToolClient'
import { partnerRegistrationHref } from '@/lib/ecosystemPartners'

export const metadata = {
  title: 'Property Management | Ecosystem Partners | MillionFlats',
  description:
    'Maximize rental income and minimize hassle—discover verified property managers, calculate net yield, and request proposals via MillionFlats.',
}

export default function PropertyManagementPage() {
  const slug = 'property-management' as const

  return (
    <div className="min-h-screen bg-gray-50">
      <EcosystemHero
        headline="Maximize Your Rental Income. Minimize Your Hassle."
        subheadline="Hand over the keys with confidence. Our verified property managers handle everything from finding tenants to maintenance, giving you peace of mind and optimal returns."
        ctaLabel="Find a Property Manager"
        ctaHref="#tools"
        imageSrc="/images/ecosystem/management.jpg"
        imageAlt="Property management"
      />

      <EcosystemSection title="Why Hire a Manager Through MillionFlats?">
        <IconPoints
          title="The MillionFlats Advantage"
          points={[
            { heading: 'Vetted & Experienced', text: 'Selected for local expertise, proven track record, and professional tenant management.' },
            { heading: 'Transparent Fees & Reporting', text: 'Clear fee structures with detailed monthly statements and dashboards.' },
            { heading: 'Tech-Driven Oversight', text: 'Platforms for rent collection, maintenance tracking, and reporting—24/7 visibility.' },
            { heading: 'Seamless Owner Experience', text: 'Hands-off ownership with a dedicated account manager.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="End-to-End Management Services">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ t: 'For NRIs/Remote Owners', d: 'Full-service management, international transfers, proxy representation.' },
            { t: 'For Domestic Investors', d: 'Tenant screening, rent escalation, financial accounting.' },
            { t: 'For All Owners', d: 'Maintenance coordination, inspections, legal compliance.' },
            { t: 'General', d: 'Vacancy management, annual budgeting, liaison with societies/RWAs.' }].map((c) => (
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
              <div className="mt-3 text-sm font-semibold text-gray-900">Management Firm {i}</div>
              <div className="mt-1 text-sm text-gray-600">98% Occupancy Rate</div>
              <div className="mt-4">
                <Link href="#directory" className="text-sm font-semibold text-dark-blue hover:underline">
                  View Services &amp; Fees
                </Link>
              </div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="How It Works">
        <HowItWorks
          steps={[
            { title: 'Submit Your Property', text: 'Share location, type, expected rent, and needs.' },
            { title: 'Get Matched Proposals', text: 'Receive tailored plans and fee quotes.' },
            { title: 'Select Your Partner', text: 'Review proposals and sign a transparent agreement.' },
            { title: 'Relax & Monitor', text: 'Manager runs operations while you track performance.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Interactive Tool & Partner Directory">
        <div id="tools" className="scroll-mt-24">
          <ManagementYieldToolClient />
        </div>

        <div className="mt-6" id="directory">
          <PartnerDirectoryPlaceholder
            filters={[
              { label: 'Type of Properties Managed', options: ['Residential', 'Commercial'] },
              { label: 'Cities/Areas', options: ['Mumbai', 'Bengaluru', 'Delhi NCR', 'Dubai'] },
              { label: 'Fee Structure', options: ['% of monthly rent', 'Fixed', 'Hybrid'] },
            ]}
          />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Owner’s Guide to Property Management">
        <ResourceList
          title="Educational Resources"
          items={[
            { title: 'Key Terms in a Management Agreement', description: 'Understand obligations and fees clearly.' },
            { title: 'How to Calculate Net Rental Yield', description: 'Plan returns with realistic cost assumptions.' },
            { title: 'Questions to Ask a Property Manager', description: 'Evaluate partners on process and reporting.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Your investment should work for you.">
        <FinalCTA
          headline="Your investment should work for you, not the other way around."
          primary={{ label: 'Get a Free Management Proposal', href: partnerRegistrationHref(slug) }}
          secondary={{ label: 'Download Our Owner-Manager Checklist', href: '#directory' }}
        />
      </EcosystemSection>
    </div>
  )
}
