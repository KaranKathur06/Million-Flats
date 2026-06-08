import type { Metadata } from 'next'
import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'
import { buildCanonicalUrl, normalizePage } from '@/lib/ecosystem/paginationSeo'

export const ECOSYSTEM_CATEGORY_PAGE_DYNAMIC = {
  dynamic: 'force-dynamic' as const,
  revalidate: 0,
}

export function createEcosystemCategoryPage(slug: EcosystemCategorySlug) {
  async function generateMetadata({
    searchParams,
  }: {
    searchParams?: { page?: string }
  }): Promise<Metadata> {
    const cfg = getEcosystemCategoryConfig(slug)
    if (!cfg) return {}

    const page = normalizePage(searchParams?.page)
    const canonical = buildCanonicalUrl({ slug, page })

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

  function CategoryPage({ searchParams }: { searchParams?: { page?: string } }) {
    const page = searchParams?.page ? Number(searchParams.page) : 1
    return (
      <EcosystemCategoryLanding slug={slug} page={Number.isFinite(page) && page > 0 ? page : 1} />
    )
  }

  return { generateMetadata, CategoryPage }
}
