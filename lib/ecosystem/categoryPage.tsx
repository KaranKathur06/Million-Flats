import type { Metadata } from 'next'
import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import { buildCanonicalUrl, normalizePage } from '@/lib/ecosystem/paginationSeo'
import { buildSocialMetadata } from '@/lib/socialMetadata'
import { prisma } from '@/lib/prisma'

export const ECOSYSTEM_CATEGORY_PAGE_DYNAMIC = {
  dynamic: 'force-dynamic' as const,
  revalidate: 0,
}

export function createEcosystemCategoryPage(slug: string) {
  async function generateMetadata({
    searchParams,
  }: {
    searchParams?: { page?: string }
  }): Promise<Metadata> {
    const category = await (prisma as any).ecosystemCategory.findFirst({
      where: { slug, isActive: true },
      select: { title: true, description: true, heroImage: true, metaTitle: true, metaDescription: true },
    })
    if (!category) return {}
    const configured = getEcosystemCategoryConfig(slug)
    const title = category.metaTitle?.trim() || configured?.meta.title || `${category.title} | Ecosystem Partners | MillionFlats`
    const description = category.metaDescription?.trim() || configured?.meta.description || category.description
    const image = category.heroImage?.trim() || configured?.meta.ogImage || configured?.heroImage.src

    const page = normalizePage(searchParams?.page)
    const canonical = buildCanonicalUrl({ slug, page })

    return {
      title,
      description,
      alternates: { canonical },
      ...buildSocialMetadata({
        title,
        description,
        url: canonical,
        image,
        imageAlt: category.title,
      }),
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
