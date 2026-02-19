import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import type { Metadata } from 'next'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import { buildCanonicalUrl, normalizePage } from '@/lib/ecosystem/paginationSeo'

export async function generateMetadata({ searchParams }: { searchParams?: { page?: string } }): Promise<Metadata> {
  const cfg = getEcosystemCategoryConfig('property-insurance')
  if (!cfg) return {}
  const page = normalizePage(searchParams?.page)
  const canonical = buildCanonicalUrl({ slug: 'property-insurance', page })
  return {
    title: cfg.meta.title,
    description: cfg.meta.description,
    alternates: { canonical },
    openGraph: {
      title: cfg.meta.title,
      description: cfg.meta.description,
      images: cfg.meta.ogImage ? [{ url: cfg.meta.ogImage }] : undefined,
    },
  }
}

export default function PropertyInsurancePage({ searchParams }: { searchParams?: { page?: string } }) {
  const page = searchParams?.page ? Number(searchParams.page) : 1
  return <EcosystemCategoryLanding slug="property-insurance" page={Number.isFinite(page) ? page : 1} />
}
