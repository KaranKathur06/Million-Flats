import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PartnerRegistrationFormClient from '@/app/ecosystem-partners/_components/PartnerRegistrationFormClient'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getEcosystemCategoryConfig(params.slug as EcosystemCategorySlug)
  if (!category) return { title: 'Partner Registration | MillionFlats' }

  return {
    title: `Partner Registration | ${category.title} | MillionFlats`,
    description: `Apply to join MillionFlats as a verified ${category.title} ecosystem partner.`,
    alternates: { canonical: `/ecosystem-partners/${category.slug}/partner-registration` },
  }
}

export default function EcosystemPartnerRegistrationFallback({ params }: Props) {
  const category = getEcosystemCategoryConfig(params.slug as EcosystemCategorySlug)
  if (!category) notFound()

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title={`Apply as a ${category.title} Partner`}
          description={`Share your business details to apply for the MillionFlats ${category.title} partner network. Our team will review your profile and credentials.`}
          category={category.slug}
          submitLabel="Submit Application"
          groups={[
            {
              title: 'Business Details',
              fields: [
                { type: 'text', name: 'legalCompanyName', label: 'Business / Legal Company Name', required: true },
                { type: 'url', name: 'website', label: 'Business Website' },
                { type: 'number', name: 'yearsInOperation', label: 'Years in Operation', required: true },
                { type: 'text', name: 'operatingCity', label: 'City / Operating Region', required: true },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'text', name: 'contactName', label: 'Primary Contact Name', required: true },
                { type: 'email', name: 'email', label: 'Official Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone / WhatsApp', required: true },
              ],
            },
            {
              title: 'Category & Credentials',
              fields: [
                { type: 'textarea', name: 'servicesOffered', label: 'Services Offered', required: true },
                { type: 'textarea', name: 'whyPartner', label: 'Why do you want to partner with MillionFlats?', required: true },
                { type: 'text', name: 'registrationNumber', label: 'Business / Professional Registration Number' },
              ],
            },
          ]}
        />
      </div>
    </main>
  )
}