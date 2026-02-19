import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import type { Metadata } from 'next'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import { buildCanonicalUrl, normalizePage } from '@/lib/ecosystem/paginationSeo'

export async function generateMetadata({ searchParams }: { searchParams?: { page?: string } }): Promise<Metadata> {
  const cfg = getEcosystemCategoryConfig('legal-documentation')
  if (!cfg) return {}
  const page = normalizePage(searchParams?.page)
  const canonical = buildCanonicalUrl({ slug: 'legal-documentation', page })
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

export default function LegalDocumentationPage({ searchParams }: { searchParams?: { page?: string } }) {
  const page = searchParams?.page ? Number(searchParams.page) : 1
  return <EcosystemCategoryLanding slug="legal-documentation" page={Number.isFinite(page) ? page : 1} />
}
