import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { page?: string }
}) {
  const { generateMetadata: gen } = createEcosystemCategoryPage(params.slug as EcosystemCategorySlug)
  return gen({ searchParams })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function EcosystemCategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { page?: string }
}) {
  const { CategoryPage } = createEcosystemCategoryPage(params.slug as EcosystemCategorySlug)
  return <CategoryPage searchParams={searchParams} />
}
