import { notFound } from 'next/navigation'
import PartnerRegistrationFormClient from '@/app/ecosystem-partners/_components/PartnerRegistrationFormClient'
import { getEcosystemRegistrationConfig } from '@/lib/ecosystem/ecosystemCategoryConfig'

export async function generateMetadata({ params }: { params: { categorySlug: string } }) {
  const cfg = getEcosystemRegistrationConfig(params.categorySlug)
  if (!cfg) return {}

  return {
    title: `${cfg.title} | MillionFlats`,
    description: cfg.description,
    alternates: {
      canonical: `https://millionflats.com/ecosystem/register/${cfg.slug}`,
    },
  }
}

export default async function EcosystemRegisterPage({ params }: { params: { categorySlug: string } }) {
  const cfg = getEcosystemRegistrationConfig(params.categorySlug)
  if (!cfg) return notFound()

  const groups = [
    { title: 'Business & Contact', fields: [...cfg.baseFields] },
    { title: 'Category Details', fields: [...cfg.extraFields] },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title={cfg.title}
          description={cfg.description}
          category={cfg.slug}
          groups={groups}
          submitLabel={cfg.submitLabel}
          submitUrl="/api/ecosystem/register"
        />
      </div>
    </div>
  )
}
