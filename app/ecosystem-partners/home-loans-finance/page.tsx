import Link from 'next/link'
import EcosystemHero from '../_components/EcosystemHero'
import EcosystemSection from '../_components/EcosystemSection'
import IconPoints from '../_components/IconPoints'
import HowItWorks from '../_components/HowItWorks'
import PartnerDirectoryPlaceholder from '../_components/PartnerDirectoryPlaceholder'
import ResourceList from '../_components/ResourceList'
import FinalCTA from '../_components/FinalCTA'
import LoanToolsClient from './_components/LoanToolsClient'
import { partnerRegistrationHref } from '@/lib/ecosystemPartners'

export const metadata = {
  title: 'Home Loans & Finance | Ecosystem Partners | MillionFlats',
  description:
    'Finance your dream home with confidence—discover curated lenders, check eligibility, compare offers, and apply through MillionFlats.',
}

export default function HomeLoansFinancePage() {
  const slug = 'home-loans-finance' as const

  return (
    <div className="min-h-screen bg-gray-50">
      <EcosystemHero
        headline="Finance Your Dream Home with Confidence"
        subheadline="Get matched with trusted lenders offering competitive rates, exclusive deals, and fast approvals—only through MillionFlats."
        ctaLabel="Check Your Eligibility in 60 Seconds"
        ctaHref="#tools"
        imageSrc="/images/ecosystem/home-loans.jpg"
        imageAlt="Happy homeowner holding keys"
      />

      <EcosystemSection title="Why Secure Your Loan Through MillionFlats?">
        <IconPoints
          title="The MillionFlats Advantage"
          points={[
            {
              heading: 'MillionFlats Verified',
              text: 'All partners are rigorously vetted for credibility and customer service.',
            },
            {
              heading: 'Best-In-Market Rates',
              text: 'We negotiate competitive terms on your behalf.',
            },
            {
              heading: 'Seamless Process',
              text: 'From pre-approval to disbursement, we facilitate smoother coordination.',
            },
            {
              heading: 'Personalised Matching',
              text: 'Our system connects you with lenders suited to your profile (salaried, self-employed, NRI).',
            },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection
        title="Interactive Tools"
        description="Use calculators and quick checks to get clarity before you compare offers."
      >
        <div id="tools" className="scroll-mt-24">
          <LoanToolsClient />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Featured Partner Showcase">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="h-10 w-28 rounded bg-gray-100" />
              <div className="mt-3 text-sm font-semibold text-gray-900">Top Partner {i}</div>
              <div className="mt-1 text-sm text-gray-600">Lowest Interest Rates for NRIs</div>
              <div className="mt-4">
                <Link
                  href="#directory"
                  className="text-sm font-semibold text-dark-blue hover:underline"
                >
                  View Details &amp; Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      </EcosystemSection>

      <EcosystemSection title="How It Works">
        <HowItWorks
          steps={[
            { title: 'Check Eligibility', text: 'Use our tools.' },
            { title: 'Compare Offers', text: 'View matched lender plans.' },
            { title: 'Connect & Apply', text: 'Choose a lender and submit documents.' },
            { title: 'Get Sanctioned', text: 'Receive your loan approval.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Comprehensive Lender Directory">
        <div id="directory" className="scroll-mt-24">
          <PartnerDirectoryPlaceholder
            filters={[
              { label: 'Bank / NBFC', options: ['Bank', 'NBFC', 'HFC'] },
              { label: 'Interest Rate Range', options: ['6–7%', '7–8%', '8–9%', '9%+'] },
              {
                label: 'Specialization',
                options: ['First-time buyer', 'NRI', 'Self-employed', 'Balance Transfer'],
              },
            ]}
          />
        </div>
      </EcosystemSection>

      <EcosystemSection title="Guide to Home Loans">
        <ResourceList
          title="Educational Resources"
          items={[
            { title: 'Fixed vs. Floating Rate', description: 'Understand which rate type suits your risk profile.' },
            { title: 'Documents Checklist', description: 'Know what to prepare before you apply.' },
            { title: 'Understanding Your Credit Score', description: 'How credit impacts approval and interest rate.' },
          ]}
        />
      </EcosystemSection>

      <EcosystemSection title="Ready to take the next step?">
        <FinalCTA
          headline="Ready to take the next step?"
          primary={{ label: 'Match Me with a Lender', href: partnerRegistrationHref(slug) }}
          secondary={{ label: 'Download a Complete Guide', href: '#resources' }}
        />
      </EcosystemSection>
    </div>
  )
}
