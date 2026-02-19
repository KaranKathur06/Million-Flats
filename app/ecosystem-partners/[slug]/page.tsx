import type { Metadata } from 'next'
import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import { buildCanonicalUrl, normalizePage } from '@/lib/ecosystem/paginationSeo'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { page?: string }
}): Promise<Metadata> {
  const cfg = getEcosystemCategoryConfig(params.slug)
  if (!cfg) return {}

  const page = normalizePage(searchParams?.page)
  const canonical = buildCanonicalUrl({ slug: params.slug, page })

  return {
    title: cfg.meta.title,
    description: cfg.meta.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: cfg.meta.title,
      description: cfg.meta.description,
      images: cfg.meta.ogImage ? [{ url: cfg.meta.ogImage }] : undefined,
    },
  }
}

export default function EcosystemCategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { page?: string }
}) {
  const page = searchParams?.page ? Number(searchParams.page) : 1
  return <EcosystemCategoryLanding slug={params.slug} page={Number.isFinite(page) ? page : 1} />
}
